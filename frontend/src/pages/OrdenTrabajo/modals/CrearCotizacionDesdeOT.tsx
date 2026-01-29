import Input from '@/components/form/Input';
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
import { TIPO_MONEDA } from '@/constants/cotizacion.constant';
import { IDetalleOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface CrearCotizacionDesdeOTProps {
    detalleTrabajo: IDetalleOrdenDeTrabajo;
    clienteId: number;
    clienteNombre: string;
    ordenId: number;
    onSuccess?: () => void;
}

function CrearCotizacionDesdeOT({
    detalleTrabajo,
    clienteId,
    clienteNombre,
    ordenId,
    onSuccess,
}: CrearCotizacionDesdeOTProps) {
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: `Cotización - ${detalleTrabajo.nombre}`,
            descripcion: detalleTrabajo.descripcion || '',
            observaciones: '',
            tipo_moneda: 'CLP',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').nonNullable('Requerido'),
            descripcion: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo_moneda: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: '/api/cotizaciones/',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        empresa: personalizacionUsuario?.empresa,
                        cliente: clienteId,
                    }),
                });

                if (response.data) {
                    // Vincular cotización al DetalleTrabajo
                    try {
                        await ApiService.fetchData({
                            url: `/api/ordenes-trabajo/detalles-trabajo/${detalleTrabajo.id}/`,
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                content_type: (response.data as any).content_type_id,
                                trabajo_id: (response.data as any).id,
                            }),
                        });
                    } catch (linkError) {
                        console.warn('No se pudo vincular cotización al trabajo:', linkError);
                    }

                    toast.success('Cotización creada y vinculada al trabajo', { autoClose: 2000 });
                    formik.resetForm();
                    setIsOpen(false);
                    if (onSuccess) onSuccess();
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response?.data || {})
                    .flat()
                    .join(' ');
                toast.error(mensajesError || 'Error al crear la cotización', {
                    toastId: 'Error al crear la cotización desde OT',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Crear Cotización'>
                <Button
                    variant='solid'
                    color='blue'
                    icon='HeroClipboardDocumentList'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Cotización desde Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {/* Info contextual */}
                        <div className='rounded-lg bg-blue-50 p-3 dark:bg-blue-950'>
                            <div className='text-sm'>
                                <div className='font-semibold text-blue-800 dark:text-blue-200'>
                                    Vinculado a:
                                </div>
                                <div className='text-blue-700 dark:text-blue-300'>
                                    OT #{ordenId} - {detalleTrabajo.nombre}
                                </div>
                                <div className='mt-1 text-blue-600 dark:text-blue-400'>
                                    Cliente: {clienteNombre}
                                </div>
                            </div>
                        </div>

                        <div className='w-full'>
                            <Badge>Nombre de la Cotización</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}>
                                <Input
                                    name='nombre'
                                    value={formik.values.nombre}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>

                        <div className='w-full'>
                            <Badge>Tipo de Moneda</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo_moneda}
                                invalidFeedback={formik.errors.tipo_moneda}>
                                <SelectReact
                                    name='tipo_moneda'
                                    options={TIPO_MONEDA}
                                    value={{
                                        value: formik.values.tipo_moneda,
                                        label:
                                            TIPO_MONEDA.find(
                                                (tm) => tm.value === formik.values.tipo_moneda,
                                            )?.label || '',
                                    }}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'tipo_moneda',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>

                        <div className='w-full'>
                            <Badge>Descripción</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    value={formik.values.descripcion}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    rows={3}
                                />
                            </Validation>
                        </div>

                        <div className='w-full'>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}>
                                <Textarea
                                    name='observaciones'
                                    value={formik.values.observaciones}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    rows={2}
                                    placeholder='Notas adicionales para el cliente...'
                                />
                            </Validation>
                        </div>

                        <div className='rounded-lg bg-amber-50 p-3 dark:bg-amber-950'>
                            <div className='text-sm text-amber-700 dark:text-amber-300'>
                                💡 <strong>Nota:</strong> Una vez creada la cotización, podrás
                                agregar items desde la vista de detalle de la cotización.
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
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Crear Cotización
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearCotizacionDesdeOT;
