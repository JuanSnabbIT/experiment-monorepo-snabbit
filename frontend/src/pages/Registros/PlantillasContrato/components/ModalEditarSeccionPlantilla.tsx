import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import {
    IEtiquetaPlantilla,
    ISeccionPlantilla,
} from '@/interface/plantillaContrato.interface';
import { useGetDetallePlantillaQuery, useUpdateSeccionPlantillaMutation } from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import PreviewDocumentalPlantilla from './PreviewDocumentalPlantilla';
import SeccionForm, { ISeccionFormValues } from './SeccionForm';

interface IModalEditarSeccionPlantillaProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plantillaId: number | string;
    seccion: ISeccionPlantilla | null;
    etiquetas: IEtiquetaPlantilla[];
}

const validationSchema = Yup.object({
    titulo: Yup.string().when('tipo', {
        is: (val: string) => val === 'libre' || val === 'salto_pagina',
        then: (schema) => schema.optional(),
        otherwise: (schema) => schema.required('Título requerido'),
    }),
    tipo: Yup.string().required('Tipo requerido'),
});

const ModalEditarSeccionPlantilla = ({
    isOpen,
    setIsOpen,
    plantillaId,
    seccion,
    etiquetas,
}: IModalEditarSeccionPlantillaProps) => {
    const [updateSeccion, { isLoading }] = useUpdateSeccionPlantillaMutation();
    const { data: plantilla } = useGetDetallePlantillaQuery(String(plantillaId));
    const [previewOpen, setPreviewOpen] = useState(false);
    const getFormValuesFromSeccion = (
        seccionValue: ISeccionPlantilla | null,
    ): ISeccionFormValues => ({
        titulo: seccionValue?.titulo || '',
        tipo: seccionValue?.tipo || 'clausula',
        contenido_template: seccionValue?.contenido_template || '',
        es_editable_en_contrato: seccionValue?.es_editable_en_contrato ?? true,
        es_obligatoria: seccionValue?.es_obligatoria ?? false,
        orden: seccionValue?.orden ?? 1,
    });

    const formik = useFormik<ISeccionFormValues>({
        enableReinitialize: true,
        initialValues: getFormValuesFromSeccion(seccion),
        validationSchema,
        onSubmit: async (values) => {
            if (!seccion) return;
            try {
                await updateSeccion({
                    plantillaId,
                    seccionId: seccion.id,
                    data: {
                        ...values,
                        tipo: values.tipo as ISeccionPlantilla['tipo'],
                    },
                }).unwrap();
                toast.success('Sección actualizada');
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        formik.resetForm({
            values: getFormValuesFromSeccion(seccion),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, seccion?.id]);

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    const handlePreviewInContext = () => {
        setPreviewOpen(true);
    };

    return (
        <>
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>Editar sección</ModalHeader>
            <ModalBody>
                <SeccionForm
                    formik={formik}
                    etiquetas={etiquetas}
                    idPrefix='edit-sec'
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button
                    icon='HeroEye'
                    onClick={handlePreviewInContext}
                    isDisable={!plantilla}>
                    Vista previa
                </Button>
                <Button
                    variant='solid'
                    icon='HeroCheck'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Guardar cambios
                </Button>
            </ModalFooter>
        </Modal>
        {plantilla && (
            <PreviewDocumentalPlantilla
                isOpen={previewOpen}
                setIsOpen={setPreviewOpen}
                plantilla={plantilla}
                etiquetas={etiquetas}
                mode='focus-section'
                focusSectionId={seccion?.id}
                sectionOverride={
                    seccion
                        ? {
                              id: seccion.id,
                              contenido_template: formik.values.contenido_template,
                              titulo: formik.values.titulo,
                              tipo: formik.values.tipo,
                          }
                        : undefined
                }
            />
        )}
        </>
    );
};

export default ModalEditarSeccionPlantilla;
