import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { IServicio } from '@/interface/contrato.interface';
import {
    useCreateServicioMutation,
    useGetCaracteristicasServicioQuery,
    useUpdateServicioMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalServicioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    servicio?: IServicio;
}

const CATEGORIAS_OPTIONS: TSelectOption[] = [
    { value: 'soporte', label: 'Soporte Técnico' },
    { value: 'desarrollo', label: 'Desarrollo de Software' },
    { value: 'capacitacion', label: 'Capacitación' },
    { value: 'mantencion', label: 'Mantención Infraestructura' },
    { value: 'datacenter', label: 'Servicios Datacenter' },
];

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Mínimo 2 caracteres')
        .max(255, 'Máximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Máximo 1000 caracteres').nullable(),
    categoria: Yup.string().required('La categoría es requerida'),
    caracteristicas_ids: Yup.array().of(Yup.number()),
});

const ModalServicio = ({ isOpen, setIsOpen, servicio }: IModalServicioProps) => {
    const isEditing = !!servicio;
    const [createServicio] = useCreateServicioMutation();
    const [updateServicio] = useUpdateServicioMutation();
    const { data: caracteristicas = [] } = useGetCaracteristicasServicioQuery();

    const caracteristicasOptions: TSelectOption[] = caracteristicas.map((c) => ({
        value: String(c.id),
        label: c.nombre,
    }));

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: servicio?.nombre || '',
            descripcion: servicio?.descripcion || '',
            categoria: servicio?.categoria || 'soporte',
            caracteristicas_ids: servicio?.caracteristicas?.map((c) => c.id) || [],
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion,
                    categoria: values.categoria,
                    caracteristicas_ids: values.caracteristicas_ids,
                };
                if (isEditing) {
                    await updateServicio({ id: servicio.id, data: payload }).unwrap();
                    toast.success('Servicio actualizado correctamente');
                } else {
                    await createServicio(payload).unwrap();
                    toast.success('Servicio creado correctamente');
                }
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Servicio' : 'Crear Servicio'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label htmlFor='nombre'>Nombre</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}>
                            <Input
                                id='nombre'
                                name='nombre'
                                placeholder='Nombre del servicio'
                                value={formik.values.nombre}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='descripcion'>Descripción</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.descripcion}
                            invalidFeedback={formik.errors.descripcion}>
                            <Textarea
                                id='descripcion'
                                name='descripcion'
                                placeholder='Descripción del servicio (opcional)'
                                value={formik.values.descripcion}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                rows={3}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='categoria'>Categoría</Label>
                        <SelectReact
                            options={CATEGORIAS_OPTIONS}
                            value={CATEGORIAS_OPTIONS.find(
                                (o) => o.value === formik.values.categoria,
                            )}
                            onChange={(option) => {
                                const selected = option as TSelectOption;
                                formik.setFieldValue('categoria', selected?.value || '');
                            }}
                            name='categoria'
                        />
                    </div>
                    <div>
                        <Label htmlFor='caracteristicas'>Características</Label>
                        <SelectReact
                            isMulti
                            options={caracteristicasOptions}
                            value={caracteristicasOptions.filter((o) =>
                                formik.values.caracteristicas_ids.includes(Number(o.value)),
                            )}
                            onChange={(options) => {
                                const selected = options as TSelectOption[];
                                formik.setFieldValue(
                                    'caracteristicas_ids',
                                    selected.map((o) => Number(o.value)),
                                );
                            }}
                            name='caracteristicas'
                            placeholder='Seleccionar características...'
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => formik.handleSubmit()}
                        isDisable={formik.isSubmitting}>
                        {isEditing ? 'Actualizar' : 'Guardar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default ModalServicio;
