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
import { TIPO_MODALIDAD_LICENCIA, TIPO_MONEDA_LICENCIA } from '@/constants/contrato.constant';
import { ILicencia } from '@/interface/contrato.interface';
import { useCreateLicenciaCatalogoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { FormikProps, useFormik } from 'formik';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { IContratoEdicion } from '../components/contrato.types';

interface IModalLicenciaContratoProps {
    isOpen: boolean;
    onClose: () => void;
    /** Formik del padre — los cambios se escriben en su array licencias[] */
    formik: FormikProps<IContratoEdicion>;
    listaLicencias: ILicencia[];
    /** Si se provee, estamos editando el item en ese índice */
    editIndex?: number;
    /** Nombre legible del catálogo para mostrar en modo edición */
    editNombreLicencia?: string;
}

interface IFormValues {
    licencia_id: string;
    tipo_modalidad: string;
    otro_tipo: string;
    cantidad: number;
    precio_unitario: number;
    fecha_inicio: string;
    fecha_fin: string;
    tipo_moneda: string;
}

function ModalLicenciaContrato({
    isOpen,
    onClose,
    formik: parentFormik,
    listaLicencias,
    editIndex,
    editNombreLicencia,
}: IModalLicenciaContratoProps) {
    const isEditing = editIndex !== undefined;
    const editItem = isEditing ? parentFormik.values.licencias[editIndex] : undefined;

    const [createLicenciaCatalogo, { isLoading: isCreatingCatalogo }] = useCreateLicenciaCatalogoMutation();

    const formik = useFormik<IFormValues>({
        enableReinitialize: true,
        initialValues: {
            licencia_id: editItem?.licencia_id?.toString() ?? '',
            tipo_modalidad: editItem?.tipo_modalidad ?? 'anual',
            otro_tipo: editItem?.otro_tipo ?? '',
            cantidad: editItem?.cantidad ?? 1,
            precio_unitario: editItem?.precio_unitario ?? 0,
            fecha_inicio: editItem?.fecha_inicio ?? '',
            fecha_fin: editItem?.fecha_fin ?? '',
            tipo_moneda: editItem?.tipo_moneda ?? 'USD',
        },
        validationSchema: Yup.object({
            licencia_id: isEditing
                ? Yup.string().notRequired()
                : Yup.string().required('Seleccione o cree una licencia'),
            tipo_modalidad: Yup.string().required('Requerido'),
            cantidad: Yup.number().min(1, 'Mínimo 1').required('Requerido'),
            precio_unitario: Yup.number().min(0, 'Mínimo 0').required('Requerido'),
        }),
        onSubmit: (values) => {
            if (isEditing) {
                const current = parentFormik.values.licencias[editIndex];
                parentFormik.setFieldValue(`licencias[${editIndex}]`, {
                    ...current,
                    tipo_modalidad: values.tipo_modalidad,
                    otro_tipo: values.otro_tipo || null,
                    cantidad: values.cantidad,
                    precio_unitario: values.precio_unitario,
                    fecha_inicio: values.fecha_inicio || null,
                    fecha_fin: values.fecha_fin || null,
                    tipo_moneda: values.tipo_moneda,
                });
            } else {
                parentFormik.setFieldValue('licencias', [
                    ...parentFormik.values.licencias,
                    {
                        licencia_id: Number(values.licencia_id),
                        tipo_modalidad: values.tipo_modalidad,
                        otro_tipo: values.otro_tipo || null,
                        cantidad: values.cantidad,
                        precio_unitario: values.precio_unitario,
                        fecha_inicio: values.fecha_inicio || null,
                        fecha_fin: values.fecha_fin || null,
                        tipo_moneda: values.tipo_moneda,
                    },
                ]);
            }
            onClose();
        },
    });

    useEffect(() => {
        if (!isOpen) formik.resetForm();
    }, [isOpen]);

    // Nombre del catálogo para mostrar en el selector (modo crear)
    const currentLicenciaLabel =
        listaLicencias.find((l) => l.id.toString() === formik.values.licencia_id)?.nombre ?? '';

    // Filtrar opciones: excluir licencias ya agregadas (salvo la que editamos)
    const usedIds = new Set(
        parentFormik.values.licencias
            .filter((_, i) => i !== editIndex)
            .map((l) => l.licencia_id)
            .filter(Boolean),
    );
    const opciones = listaLicencias
        .filter((l) => !usedIds.has(l.id))
        .map((l) => ({ value: l.id.toString(), label: l.nombre }));

    return (
        <Modal isOpen={isOpen} setIsOpen={onClose}>
            <ModalHeader>
                {isEditing ? 'Editar Licencia' : 'Agregar Licencia'}
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {/* Selector de catálogo (solo en creación) */}
                    {!isEditing ? (
                        <div>
                            <Label htmlFor='licencia_id'>Licencia</Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.licencia_id}
                                invalidFeedback={formik.errors.licencia_id}>
                                <SelectReact
                                    name='licencia_id'
                                    isCreatable
                                    formatCreateLabel={(v) => `Crear licencia: "${v}"`}
                                    onCreateOption={async (v) => {
                                        try {
                                            const result = await createLicenciaCatalogo({
                                                nombre: v,
                                            }).unwrap();
                                            formik.setFieldValue(
                                                'licencia_id',
                                                result.id.toString(),
                                            );
                                            toast.success(`Licencia "${v}" creada`, {
                                                autoClose: 1500,
                                            });
                                        } catch (error: unknown) {
                                            toast.error(getErrorMessage(error));
                                        }
                                    }}
                                    options={opciones}
                                    onChange={(e) =>
                                        formik.setFieldValue(
                                            'licencia_id',
                                            (e as TSelectOption).value,
                                        )
                                    }
                                    value={
                                        formik.values.licencia_id
                                            ? {
                                                  value: formik.values.licencia_id,
                                                  label: currentLicenciaLabel,
                                              }
                                            : null
                                    }
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={(e) => `No existe "${e.inputValue}"`}
                                />
                            </Validation>
                        </div>
                    ) : (
                        <div>
                            <Label htmlFor='licencia_id'>Licencia</Label>
                            <div className='mt-1 font-medium'>{editNombreLicencia ?? '—'}</div>
                        </div>
                    )}

                    {/* Modalidad */}
                    <div>
                        <Label htmlFor='tipo_modalidad'>Modalidad</Label>
                        <SelectReact
                            name='tipo_modalidad'
                            options={TIPO_MODALIDAD_LICENCIA}
                            value={TIPO_MODALIDAD_LICENCIA.find(
                                (m) => m.value === formik.values.tipo_modalidad,
                            )}
                            onChange={(e) =>
                                formik.setFieldValue(
                                    'tipo_modalidad',
                                    (e as TSelectOption).value,
                                )
                            }
                        />
                    </div>
                    {formik.values.tipo_modalidad === 'otros' && (
                        <div>
                            <Label htmlFor='otro_tipo'>Señale la modalidad</Label>
                            <Input
                                name='otro_tipo'
                                value={formik.values.otro_tipo}
                                onChange={formik.handleChange}
                            />
                        </div>
                    )}

                    {/* Cantidad y precio */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Label htmlFor='cantidad'>Cantidad</Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    name='cantidad'
                                    type='number'
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='precio_unitario'>Precio Unitario</Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.precio_unitario}
                                invalidFeedback={formik.errors.precio_unitario}>
                                <Input
                                    name='precio_unitario'
                                    type='number'
                                    value={formik.values.precio_unitario}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='fecha_inicio'>Fecha Inicio</Label>
                            <Input
                                name='fecha_inicio'
                                type='date'
                                value={formik.values.fecha_inicio}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor='fecha_fin'>Fecha Fin</Label>
                            <Input
                                name='fecha_fin'
                                type='date'
                                value={formik.values.fecha_fin}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>

                    {/* Moneda */}
                    <div>
                        <Label htmlFor='tipo_moneda'>Moneda</Label>
                        <SelectReact
                            name='tipo_moneda'
                            options={TIPO_MONEDA_LICENCIA}
                            value={TIPO_MONEDA_LICENCIA.find(
                                (m) => m.value === formik.values.tipo_moneda,
                            )}
                            onChange={(e) =>
                                formik.setFieldValue('tipo_moneda', (e as TSelectOption).value)
                            }
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        isDisable={isCreatingCatalogo || formik.isSubmitting}
                        onClick={() => formik.handleSubmit()}>
                        {isEditing ? 'Guardar cambios' : 'Agregar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalLicenciaContrato;
