import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { ITareaOTV3 } from '@/interface/ordenTrabajoV3.interface';
import {
    useCambiarEstadoTareaV3Mutation,
    useCompletarTareaConFirmaV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    tarea: ITareaOTV3 | null;
    ordenId: number;
    receptoresOptions?: TSelectOption[];
}

const validationSchema = Yup.object({
    notas_ejecucion: Yup.string().required('Las notas de ejecucion son requeridas'),
    nombre_firmante: Yup.string(),
});

const CompletarTareaOTV3 = ({ isOpen, setIsOpen, tarea, ordenId, receptoresOptions = [] }: IProps) => {
    const sigRef = useRef<SignatureCanvas>(null);
    const [completarTareaFirma, { isLoading: loadingFirma }] = useCompletarTareaConFirmaV3Mutation();
    const [cambiarEstadoTarea, { isLoading: loadingEstado }] = useCambiarEstadoTareaV3Mutation();
    const isLoading = loadingFirma || loadingEstado;

    const esEntregaEquipo = tarea?.tipo_tarea === 'entrega_equipo';

    const formik = useFormik({
        initialValues: {
            notas_ejecucion: '',
            nombre_firmante: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            if (!tarea) return;
            try {
                if (tarea.requiere_firma || esEntregaEquipo) {
                    const nombreFirmante = esEntregaEquipo
                        ? (tarea.usuario_receptor_nombre ?? '')
                        : values.nombre_firmante;
                    if (!nombreFirmante.trim()) {
                        toast.error('El nombre del firmante es requerido');
                        return;
                    }
                    if (!sigRef.current || sigRef.current.isEmpty()) {
                        toast.error('La firma es requerida');
                        return;
                    }
                    await completarTareaFirma({
                        ordenId,
                        tareaId: tarea.id,
                        notas_ejecucion: values.notas_ejecucion,
                        firma_datos: {
                            nombre: nombreFirmante,
                            firma_base64: sigRef.current.toDataURL(),
                        },
                    }).unwrap();
                } else {
                    await cambiarEstadoTarea({
                        ordenId,
                        tareaId: tarea.id,
                        estado: 'completada',
                        notas_ejecucion: values.notas_ejecucion,
                    }).unwrap();
                }
                toast.success('Tarea completada');
                resetForm();
                sigRef.current?.clear();
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        sigRef.current?.clear();
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='lg'>
            <ModalHeader>Completar Tarea: {tarea?.titulo}</ModalHeader>
            <form onSubmit={formik.handleSubmit}>
                <ModalBody className='grid grid-cols-1 gap-4'>
                    {/* Badge de tipo si es entrega de equipo */}
                    {esEntregaEquipo && (
                        <div className='flex items-center gap-2'>
                            <Badge color='violet'>Entrega de equipo</Badge>
                            {tarea?.usuario_receptor_nombre && (
                                <span className='text-sm text-gray-600 dark:text-gray-400'>
                                    Receptor: <span className='font-medium'>{tarea.usuario_receptor_nombre}</span>
                                </span>
                            )}
                        </div>
                    )}

                    <div>
                        <Label htmlFor='notas_ejecucion' className='mb-1'>
                            Notas de ejecucion <span className='text-red-500'>*</span>
                        </Label>
                        <Textarea
                            id='notas_ejecucion'
                            name='notas_ejecucion'
                            value={formik.values.notas_ejecucion}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={4}
                            placeholder='Describe lo que se realizo en esta tarea...'
                        />
                        {formik.touched.notas_ejecucion && formik.errors.notas_ejecucion && (
                            <p className='mt-1 text-sm text-red-500'>
                                {formik.errors.notas_ejecucion}
                            </p>
                        )}
                    </div>



                    {(tarea?.requiere_firma || esEntregaEquipo) && (
                        <div className='grid grid-cols-1 gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20'>
                            <p className='text-sm font-semibold text-amber-800 dark:text-amber-300'>
                                {esEntregaEquipo ? 'Firma del receptor' : 'Esta tarea requiere firma del cliente'}
                            </p>

                            <div>
                                <Label htmlFor='nombre_firmante' className='mb-1'>
                                    Usuario firmante{' '}
                                    <span className='text-red-500'>*</span>
                                </Label>
                                {esEntregaEquipo ? (
                                    <p className='rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800'>
                                        {tarea?.usuario_receptor_nombre ?? '—'}
                                    </p>
                                ) : receptoresOptions.length > 0 ? (
                                    <SelectReact
                                        id='nombre_firmante'
                                        name='nombre_firmante'
                                        options={receptoresOptions}
                                        isClearable
                                        placeholder='Selecciona quien firma...'
                                        value={
                                            receptoresOptions.find(
                                                (o) => o.label === formik.values.nombre_firmante,
                                            ) ?? null
                                        }
                                        onChange={(opt) =>
                                            formik.setFieldValue(
                                                'nombre_firmante',
                                                opt ? (opt as TSelectOption).label : '',
                                            )
                                        }
                                    />
                                ) : (
                                    <Input
                                        id='nombre_firmante'
                                        name='nombre_firmante'
                                        value={formik.values.nombre_firmante}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        placeholder='Nombre completo del receptor...'
                                    />
                                )}
                            </div>

                            <div>
                                <div className='mb-1 flex items-center justify-between'>
                                    <Label htmlFor='firma_canvas' className='mb-0'>
                                        Firma <span className='text-red-500'>*</span>
                                    </Label>
                                    <Button
                                        size='sm'
                                        color='red'
                                        icon='HeroXMark'
                                        onClick={() => sigRef.current?.clear()}>
                                        Limpiar
                                    </Button>
                                </div>
                                <div className='overflow-hidden rounded-md border-2 border-dashed border-amber-400 bg-white dark:border-amber-600'>
                                    <SignatureCanvas
                                        ref={sigRef}
                                        penColor='#1e293b'
                                        canvasProps={{
                                            id: 'firma_canvas',
                                            className: 'w-full',
                                            height: 180,
                                        }}
                                    />
                                </div>
                                <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
                                    Dibuje la firma en el area gris
                                </p>
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleClose} isDisable={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant='solid' color='emerald' isLoading={isLoading} onClick={() => { void formik.submitForm(); }}>
                        Marcar como completada
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default CompletarTareaOTV3;

