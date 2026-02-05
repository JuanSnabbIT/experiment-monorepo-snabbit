import Input from '@/components/form/Input';
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
import { ESTADO_ENTREGA_EQUIPO } from '@/constants/visitas.constant';
import { IEntregaEquipo, IEntregaEquipoEnOT } from '@/interface/visitas.interface';
import ApiService from '@/services/ApiService';
import { detalleConVisitaThunk, listaEntregaEquipoThunk, useAppDispatch } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CambiarEstadoEntregaEquipo({
    entrega,
    tipo,
}: {
    entrega: IEntregaEquipo | IEntregaEquipoEnOT;
    tipo?: string;
}) {
    const dispatch = useAppDispatch();
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            estado_entrega: '',
            observaciones_entrega: '',
            nombre_quien_recibe: '',
        },
        validationSchema: Yup.object().shape({
            estado_entrega: Yup.string().required('Requerido').nonNullable('Requerido'),
            observaciones_entrega: Yup.string().notRequired().nonNullable('Requerido'),
            nombre_quien_recibe: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                let data = {
                    observaciones_entrega: values.observaciones_entrega,
                    estado_entrega: values.estado_entrega,
                };
                if (
                    values.estado_entrega === 'entregado' ||
                    values.estado_entrega === 'no_usuario'
                ) {
                    Object.assign(data, {
                        firma_entregado: sigCanvas.current?.toDataURL('image/png'),
                    });
                }
                if (values.estado_entrega === 'no_usuario') {
                    Object.assign(data, { nombre_quien_recibe: values.nombre_quien_recibe });
                }
                const response = await ApiService.fetchData({
                    url: `/api/visitas-soporte/${entrega.visita}/entregas-equipos/${entrega.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    if (
                        values.estado_entrega === 'entregado' ||
                        values.estado_entrega === 'no_usuario'
                    ) {
                        const responseUsuarioEquipo = await ApiService.fetchData({
                            url: `/api/usuarios-equipo/`,
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                equipo: entrega.equipo,
                                usuario: entrega.usuario_a_entregar,
                            }),
                        });
                    }
                    toast.success('Entrega cambiada', { autoClose: 1000 });
                    if (tipo === '1') {
                        dispatch(listaEntregaEquipoThunk({ id_visita: entrega.visita }));
                    } else {
                        dispatch(listaEntregaEquipoThunk({ id_visita: entrega.visita }));
                    }
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al firmar la entrega', {
                    toastId: 'Error al firmar la entrega',
                });
            }
        },
    });

    useEffect(() => {
        if (entrega && isOpen) {
            formik.setValues({
                estado_entrega: entrega.estado_entrega,
                observaciones_entrega: entrega.observaciones_entrega,
                nombre_quien_recibe: '',
            });
            sigCanvas.current?.fromDataURL(entrega.firma_entregado);
        }
    }, [entrega, isOpen]);

    return (
        <>
            {entrega.se_puede_firmar ? (
                <Tooltip text='Cambiar Estado'>
                    <Button
                        color='sky'
                        variant='solid'
                        icon='HeroArrowPathRoundedSquare'
                        onClick={() => {
                            setIsOpen(true);
                        }}
                    />
                </Tooltip>
            ) : (
                <Tooltip text='El equipo necesita más datos'>
                    <div>
                        <Button
                            color='sky'
                            variant='solid'
                            icon='HeroArrowPathRoundedSquare'
                            isDisable={true}
                        />
                    </div>
                </Tooltip>
            )}
            <Modal size={'lg'} isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Firmar la Entrega del Equipo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full'>
                            <Badge>Estado</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.estado_entrega}
                                invalidFeedback={formik.errors.estado_entrega}>
                                <SelectReact
                                    name='estado_entrega'
                                    options={ESTADO_ENTREGA_EQUIPO}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'estado_entrega',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                    value={ESTADO_ENTREGA_EQUIPO.find(
                                        (ent) => ent.value === formik.values.estado_entrega,
                                    )}
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione un estado'
                                />
                            </Validation>
                        </div>
                        {formik.values.estado_entrega === 'no_usuario' && (
                            <div className='w-full'>
                                <Badge>Nombre de Quien Recibe</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre_quien_recibe}
                                    invalidFeedback={formik.errors.nombre_quien_recibe}>
                                    <Input
                                        name='nombre_quien_recibe'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                    />
                                </Validation>
                            </div>
                        )}
                        {(formik.values.estado_entrega === 'entregado' ||
                            formik.values.estado_entrega === 'no_usuario') && (
                            <div className='w-full'>
                                <Badge>Firma</Badge>
                                <div
                                    className='signature-surface'
                                    style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
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
                        )}
                        <div className='w-full'>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones_entrega}
                                invalidFeedback={formik.errors.observaciones_entrega}>
                                <Textarea
                                    name='observaciones_entrega'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.observaciones_entrega}
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
                            onClick={async () => {
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

export default CambiarEstadoEntregaEquipo;
