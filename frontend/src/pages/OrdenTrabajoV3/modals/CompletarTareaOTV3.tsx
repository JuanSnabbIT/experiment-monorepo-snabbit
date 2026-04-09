import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { ITareaOTV3 } from '@/interface/ordenTrabajoV3.interface';
import {
    useCambiarEstadoTareaV3Mutation,
    useCompletarTareaConFirmaV3Mutation,
    useGetEquiposParaEntregaV3Query,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useRef, useState } from 'react';
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

    // Equipos seleccionados para entrega (solo aplica a tipo_tarea=entrega_equipo)
    const [equiposSeleccionados, setEquiposSeleccionados] = useState<number[]>([]);
    const [cantidadAsignada, setCantidadAsignada] = useState(1);
    const esEntregaEquipo = tarea?.tipo_tarea === 'entrega_equipo';
    const itemGuia = tarea?.item_guia_origen_detalle ?? null;
    const esSerializado = itemGuia ? itemGuia.individualizado : true; // default: serializado
    const { data: equiposDisponibles = [] } = useGetEquiposParaEntregaV3Query(ordenId, {
        skip: !isOpen || !esEntregaEquipo || !esSerializado,
    });

    const toggleEquipo = (equipoId: number) => {
        setEquiposSeleccionados((prev) =>
            prev.includes(equipoId) ? prev.filter((id) => id !== equipoId) : [...prev, equipoId],
        );
    };

    const formik = useFormik({
        initialValues: {
            notas_ejecucion: '',
            nombre_firmante: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            if (!tarea) return;
            try {
                if (tarea.requiere_firma) {
                    if (!values.nombre_firmante.trim()) {
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
                            nombre: values.nombre_firmante,
                            firma_base64: sigRef.current.toDataURL(),
                        },
                        ...(esEntregaEquipo && esSerializado && equiposSeleccionados.length > 0
                            ? { asignaciones_equipos: equiposSeleccionados.map((id) => ({ equipo_id: id })) }
                            : {}),
                        ...(esEntregaEquipo && !esSerializado
                            ? { cantidad_asignada: cantidadAsignada }
                            : {}),
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
                setEquiposSeleccionados([]);
                setCantidadAsignada(1);
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        sigRef.current?.clear();
        setEquiposSeleccionados([]);
        setCantidadAsignada(1);
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

                    {/* Seleccion de equipos a entregar (item serializado) */}
                    {esEntregaEquipo && esSerializado && (
                        <div className='rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-900/20'>
                            <p className='mb-2 text-sm font-semibold text-violet-800 dark:text-violet-300'>
                                Equipos a entregar ({equiposSeleccionados.length} seleccionados)
                            </p>
                            {equiposDisponibles.length === 0 ? (
                                <p className='text-xs text-violet-600'>No hay equipos disponibles registrados.</p>
                            ) : (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Serie</Th>
                                            <Th>Tipo / Modelo</Th>
                                            <Th>Estado</Th>
                                            <Th>Sel.</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {equiposDisponibles.map((eq) => (
                                            <Tr
                                                key={eq.id}
                                                className={`cursor-pointer transition-colors ${equiposSeleccionados.includes(eq.id) ? 'bg-violet-100 dark:bg-violet-900/40' : ''}`}
                                                onClick={() => toggleEquipo(eq.id)}>
                                                <Td className='font-mono text-xs'>{eq.numero_serie}</Td>
                                                <Td className='text-xs'>
                                                    {eq.tipo_equipo_label} {eq.modelo && `— ${eq.modelo}`}
                                                </Td>
                                                <Td>
                                                    <Badge color={eq.estado ? 'emerald' : 'red'}>
                                                        {eq.estado ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    {equiposSeleccionados.includes(eq.id) ? (
                                                        <Badge color='violet'>✓</Badge>
                                                    ) : (
                                                        <span className='text-gray-400'>—</span>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                        </div>
                    )}

                    {/* Item no serializado: cantidad a asignar */}
                    {esEntregaEquipo && !esSerializado && itemGuia && (
                        <div className='rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-900/20'>
                            <p className='mb-3 text-sm font-semibold text-violet-800 dark:text-violet-300'>
                                Item a entregar
                            </p>
                            <p className='mb-3 text-sm text-violet-700 dark:text-violet-300'>
                                <span className='font-medium'>{itemGuia.nombre_item}</span>
                                <span className='ml-2 text-xs text-violet-500'>
                                    (disponible: {itemGuia.cantidad_rebajada})
                                </span>
                            </p>
                            <div className='flex items-center gap-3'>
                                <Label htmlFor='cantidad_asignada' className='mb-0 whitespace-nowrap'>
                                    Cantidad a asignar
                                </Label>
                                <Input
                                    id='cantidad_asignada'
                                    name='cantidad_asignada'
                                    type='number'
                                    min={1}
                                    max={itemGuia.cantidad_rebajada}
                                    value={cantidadAsignada}
                                    onChange={(e) =>
                                        setCantidadAsignada(
                                            Math.min(
                                                itemGuia.cantidad_rebajada,
                                                Math.max(1, parseInt(e.target.value) || 1),
                                            ),
                                        )
                                    }
                                    className='w-24'
                                />
                            </div>
                        </div>
                    )}

                    {tarea?.requiere_firma && (
                        <div className='grid grid-cols-1 gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20'>
                            <p className='text-sm font-semibold text-amber-800 dark:text-amber-300'>
                                Esta tarea requiere firma del cliente
                            </p>

                            <div>
                                <Label htmlFor='nombre_firmante' className='mb-1'>
                                    Usuario firmante{' '}
                                    <span className='text-red-500'>*</span>
                                    <span className='ml-1 text-xs font-normal text-gray-400'>(usuario de la empresa cliente)</span>
                                </Label>
                                {receptoresOptions.length > 0 ? (
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

