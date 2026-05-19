import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { IEtiquetaPlantilla, ISeccionPlantilla } from '@/interface/plantillaContrato.interface';
import { useCreateSeccionPlantillaMutation } from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import SeccionForm, { ISeccionFormValues } from './SeccionForm';

interface IModalCrearSeccionPlantillaProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plantillaId: number | string;
    etiquetas: IEtiquetaPlantilla[];
    nextOrder: number;
    onCreated: (seccion: ISeccionPlantilla) => void;
}

const validationSchema = Yup.object({
    titulo: Yup.string().when('tipo', {
        is: 'libre',
        then: (schema) => schema.optional(),
        otherwise: (schema) => schema.required('Título requerido'),
    }),
    tipo: Yup.string().required('Tipo requerido'),
});

const ModalCrearSeccionPlantilla = ({
    isOpen,
    setIsOpen,
    plantillaId,
    etiquetas,
    nextOrder,
    onCreated,
}: IModalCrearSeccionPlantillaProps) => {
    const [createSeccion, { isLoading }] = useCreateSeccionPlantillaMutation();

    const formik = useFormik<ISeccionFormValues>({
        enableReinitialize: true,
        initialValues: {
            titulo: '',
            tipo: 'clausula',
            contenido_template: '',
            es_editable_en_contrato: true,
            es_obligatoria: false,
            orden: nextOrder,
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                const nueva = await createSeccion({
                    plantillaId,
                    data: {
                        ...values,
                        tipo: values.tipo as ISeccionPlantilla['tipo'],
                    },
                }).unwrap();
                toast.success('Sección creada');
                resetForm();
                setIsOpen(false);
                onCreated(nueva);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>Nueva sección</ModalHeader>
            <ModalBody>
                <SeccionForm
                    formik={formik}
                    etiquetas={etiquetas}
                    idPrefix='crear-sec'
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Guardar sección
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalCrearSeccionPlantilla;
