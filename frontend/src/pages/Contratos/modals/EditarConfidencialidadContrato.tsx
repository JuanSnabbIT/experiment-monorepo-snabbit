import Input from '@/components/form/Input';
import Radio, { RadioGroup } from '@/components/form/Radio';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import SignatureCanvas from 'react-signature-canvas';
import {
    listaAcuerdosBaseThunk,
    listaFirmasConfidencialidadThunk,
    listaUsuariosTodoElClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import ApiService from '@/services/ApiService';
import { IFirmaConfidencialidad } from '@/interface/contrato.interface';

const validationSchema = Yup.object().shape({
    acuerdo_base: Yup.string().nonNullable('Requerido').required('Requerido'),
    firma_usuario_empresa: Yup.string().nonNullable('Requerido').required('Requerido'),
    firmado: Yup.string().nullable().notRequired(),
    fecha_firma: Yup.string().nullable().notRequired(),
    archivo_firma: Yup.string().nullable().notRequired(),
});

function EditarConfidencialidadContrato({ firma }: { firma: IFirmaConfidencialidad }) {
    const dispatch = useAppDispatch();
    const { detalleContratoEmpresaCliente } = useAppSelector((state) => state.contrato);
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const { listaAcuerdosBase } = useAppSelector((state) => state.core);
    const [esArchivo, setEsArchivo] = useState<number>(0);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (isOpen && detalleContratoEmpresaCliente) {
            dispatch(
                listaUsuariosTodoElClienteThunk({
                    id_empresa: detalleContratoEmpresaCliente.empresa_cliente,
                }),
            );
            dispatch(listaAcuerdosBaseThunk());
        }
        if (isOpen && firma) {
            formik.setValues({
                acuerdo_base: firma.acuerdo_base.toString(),
                archivo_firma: firma.archivo_firma,
                fecha_firma: firma.fecha_firma,
                firma_usuario_empresa: firma.firma_usuario_empresa.toString(),
                firmado: firma.firmado ? 'true' : 'false',
            });
        }
    }, [isOpen, detalleContratoEmpresaCliente]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            acuerdo_base: '',
            firma_usuario_empresa: '',
            firmado: '',
            fecha_firma: '',
            archivo_firma: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            // Convertir el valor 'firmado' a booleano
            const isFirmado = values.firmado === 'true';

            // Si el usuario indicó que está firmado y se espera un archivo subido,
            // se valida que values.archivo_firma no esté vacío.
            if (isFirmado && esArchivo === 0 && !values.archivo_firma) {
                toast.error('No ha subido ninguna archivo para la firma', {
                    toastId: 'No ha subido ninguna archivo para la firma',
                });
                return;
            }

            // Dependiendo de la fuente de la firma, se establece el valor de archivo_firma:
            // - Si esArchivo es 0, se toma el valor del input.
            // - De lo contrario, se utiliza el canvas para generar la firma.
            const archivoFirma = isFirmado
                ? esArchivo === 0
                    ? values.archivo_firma
                    : sigCanvas.current?.toDataURL('image/png')
                : null;

            // Construir el objeto de datos a enviar a la API
            const payload = {
                ...values,
                firmado: isFirmado,
                archivo_firma: archivoFirma,
            };

            try {
                const response = await ApiService.fetchData({
                    url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/firmas/${firma.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(payload),
                });
                if (response.data) {
                    dispatch(
                        listaFirmasConfidencialidadThunk({
                            id_contrato: detalleContratoEmpresaCliente?.id,
                        }),
                    );
                    setIsOpen(false);
                    formik.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response?.data || 'Error al crear la firma de confidencialidad', {
                    toastId: 'Error al crear la firma de confidencialidad',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Editar Firma de Confidencialidad'>
                <Button
                    variant='solid'
                    icon='HeroPencil'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Editar Firma de Confidencialidad</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Acuerdo Base</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.acuerdo_base}
                                invalidFeedback={formik.errors.acuerdo_base}>
                                <SelectReact
                                    name='acuerdo_base'
                                    options={listaAcuerdosBase.map((acuerdo) => ({
                                        value: acuerdo.id.toString(),
                                        label: acuerdo.titulo,
                                    }))}
                                    value={{
                                        value: formik.values.acuerdo_base,
                                        label:
                                            listaAcuerdosBase.find(
                                                (acuerdo) =>
                                                    acuerdo.id.toString() ===
                                                    formik.values.acuerdo_base,
                                            )?.titulo || '',
                                    }}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'acuerdo_base',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Contenido</Badge>
                            <div className='ml-4'>
                                {listaAcuerdosBase.find(
                                    (acuerdo) =>
                                        acuerdo.id.toString() === formik.values.acuerdo_base,
                                )?.contenido || 'Seleccione un Acuerdo'}
                            </div>
                        </div>
                        <div>
                            <Badge>Fecha de Firma</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_firma}
                                invalidFeedback={formik.errors.fecha_firma}>
                                <Input
                                    name='fecha_firma'
                                    type='date'
                                    onChange={formik.handleChange}
                                    value={formik.values.fecha_firma}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Firmado</Badge>
                            <RadioGroup isInline>
                                <Radio
                                    label='Si'
                                    name={'firmado'}
                                    selectedValue={formik.values.firmado}
                                    value={'true'}
                                    onChange={() => {
                                        formik.setFieldValue('firmado', 'true');
                                    }}></Radio>
                                <Radio
                                    label='No'
                                    name={'noFirmado'}
                                    selectedValue={formik.values.firmado}
                                    value={'false'}
                                    onChange={() => {
                                        formik.setFieldValue('firmado', 'false');
                                    }}></Radio>
                            </RadioGroup>
                        </div>
                        <div>
                            <Badge>Usuario</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.firma_usuario_empresa}
                                invalidFeedback={formik.errors.firma_usuario_empresa}>
                                <SelectReact
                                    name='firma_usuario_empresa'
                                    options={listaUsuariosTodoElCliente.map((user) => ({
                                        value: user.id.toString(),
                                        label: user.nombre_usuario,
                                    }))}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'firma_usuario_empresa',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                    value={{
                                        value: formik.values.firma_usuario_empresa,
                                        label:
                                            listaUsuariosTodoElCliente.find(
                                                (user) =>
                                                    user.id.toString() ===
                                                    formik.values.firma_usuario_empresa,
                                            )?.nombre_usuario || '',
                                    }}
                                />
                            </Validation>
                        </div>
                        <div>
                            <RadioGroup isInline>
                                <Radio
                                    label='Archivo'
                                    name={'esArchivo'}
                                    selectedValue={esArchivo}
                                    value={0}
                                    onChange={() => {
                                        setEsArchivo(0);
                                        clear();
                                    }}></Radio>
                                <Radio
                                    label='Firma'
                                    name={'noEsArchivo'}
                                    selectedValue={esArchivo}
                                    value={1}
                                    onChange={() => {
                                        setEsArchivo(1);
                                        clear();
                                    }}></Radio>
                            </RadioGroup>
                        </div>
                        <div>
                            <Badge>{!esArchivo ? 'Archivo' : 'Firma'}</Badge>
                            {esArchivo ? (
                                <div>
                                    <div
                                        className='signature-surface'
                                        style={{
                                            width: '100%',
                                            maxWidth: '600px',
                                            margin: '0 auto',
                                        }}>
                                        <SignatureCanvas
                                            ref={(ref) => {
                                                sigCanvas.current = ref;
                                            }}
                                            penColor='black'
                                            canvasProps={{
                                                height: 200,
                                                className: 'signature-canvas',
                                            }}
                                        />
                                    </div>
                                    <Button className='mt-2' variant='solid' onClick={clear}>
                                        Limpiar
                                    </Button>
                                </div>
                            ) : (
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.archivo_firma}
                                    invalidFeedback={formik.errors.archivo_firma}>
                                    <Input
                                        name='archivo_firma'
                                        onBlur={formik.handleBlur}
                                        type='file'
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];

                                                // Instancia del FileReader para leer el archivo
                                                const reader = new FileReader();

                                                // Configuramos el FileReader para leer el archivo como Data URL (base64)
                                                reader.readAsDataURL(file);

                                                // Evento que se dispara cuando la lectura es exitosa
                                                reader.onload = () => {
                                                    // Obtiene el resultado en formato base64
                                                    const base64String = reader.result as string;
                                                    formik.setFieldValue(
                                                        'archivo_firma',
                                                        base64String,
                                                    );
                                                };

                                                // Manejo de errores en la lectura del archivo
                                                reader.onerror = (error) => {
                                                    console.error(
                                                        'Error al convertir el archivo a base64:',
                                                        error,
                                                    );
                                                };
                                            }
                                        }}
                                    />
                                </Validation>
                            )}
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
                            Editar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default EditarConfidencialidadContrato;
