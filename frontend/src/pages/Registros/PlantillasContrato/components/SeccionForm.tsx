import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Alert from '@/components/ui/Alert';
import { CONTENIDO_CANONICO_FIRMAS, TIPOS_SECCION } from '@/constants/contrato.constant';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import { FormikProps } from 'formik';
import { useEffect } from 'react';
import EditorSeccion from './EditorSeccion';

export interface ISeccionFormValues {
    titulo: string;
    tipo: string;
    contenido_template: string;
    orden: number;
    es_editable_en_contrato: boolean;
    es_obligatoria: boolean;
}

const tipoSeccionOptions: TSelectOption[] = TIPOS_SECCION.map((tipo) => ({
    value: tipo.value,
    label: tipo.label,
}));

interface ISeccionFormProps {
    formik: FormikProps<ISeccionFormValues>;
    etiquetas: IEtiquetaPlantilla[];
    idPrefix?: string;
}

const SeccionForm = ({
    formik,
    etiquetas,
    idPrefix = 'sec',
}: ISeccionFormProps) => {
    const esFirmas = formik.values.tipo === 'firmas';
    const esTitulo = formik.values.tipo === 'titulo';
    const esLibre = formik.values.tipo === 'libre';
    const esSaltoPagina = formik.values.tipo === 'salto_pagina';

    useEffect(() => {
        if (esFirmas) {
            if (formik.values.titulo !== 'Firmas') formik.setFieldValue('titulo', 'Firmas');
            if (formik.values.contenido_template !== CONTENIDO_CANONICO_FIRMAS)
                formik.setFieldValue('contenido_template', CONTENIDO_CANONICO_FIRMAS);
            if (formik.values.es_editable_en_contrato) formik.setFieldValue('es_editable_en_contrato', false);
            if (!formik.values.es_obligatoria) formik.setFieldValue('es_obligatoria', true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esFirmas]);

    useEffect(() => {
        if (esTitulo && formik.values.contenido_template !== '')
            formik.setFieldValue('contenido_template', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esTitulo]);

    useEffect(() => {
        if (esLibre && formik.values.titulo !== '')
            formik.setFieldValue('titulo', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esLibre]);

    useEffect(() => {
        if (esSaltoPagina) {
            if (formik.values.titulo !== '') formik.setFieldValue('titulo', '');
            if (formik.values.contenido_template !== '') formik.setFieldValue('contenido_template', '');
            if (formik.values.es_editable_en_contrato) formik.setFieldValue('es_editable_en_contrato', false);
            if (formik.values.es_obligatoria) formik.setFieldValue('es_obligatoria', false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esSaltoPagina]);

    return (
        <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {!esLibre && !esSaltoPagina && (
                    <div>
                        <Label htmlFor={`${idPrefix}-titulo`}>Título</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id={`${idPrefix}-titulo`}
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={esFirmas}
                            />
                        </Validation>
                    </div>
                )}
                <div className={esLibre || esSaltoPagina ? 'md:col-span-2' : ''}>
                    <Label htmlFor={`${idPrefix}-tipo`}>Tipo</Label>
                    <SelectReact
                        id={`${idPrefix}-tipo`}
                        name='tipo'
                        options={tipoSeccionOptions}
                        value={tipoSeccionOptions.find(
                            (option) => option.value === formik.values.tipo,
                        )}
                        onChange={(option) =>
                            formik.setFieldValue(
                                'tipo',
                                (option as TSelectOption)?.value || '',
                            )
                        }
                        menuPortalTarget={document.body}
                        menuPosition='fixed'
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>
            </div>

            {esFirmas ? (
                <Alert color='blue' variant='outline' className='text-sm'>
                    <p className='font-semibold'>Zona de firmas</p>
                    <p className='mt-1 text-zinc-500'>
                        El contenido se genera automáticamente con los datos del contrato.
                    </p>
                </Alert>
            ) : esTitulo ? (
                <Alert color='zinc' variant='outline' className='text-sm'>
                    <p className='font-semibold'>Título</p>
                    <p className='mt-1 text-zinc-500'>
                        Solo muestra el texto del título, sin contenido adicional.
                    </p>
                </Alert>
            ) : esSaltoPagina ? (
                <Alert color='zinc' variant='outline' className='text-sm'>
                    <p className='font-semibold'>Salto de página</p>
                    <p className='mt-1 text-zinc-500'>
                        Inserta un quiebre de página en el documento generado.
                    </p>
                </Alert>
            ) : (
                <EditorSeccion
                    value={formik.values.contenido_template}
                    onChange={(value) => formik.setFieldValue('contenido_template', value)}
                    etiquetas={etiquetas}
                    label='Texto de la sección'
                />
            )}

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                    <Checkbox
                        id={`${idPrefix}-editable`}
                        name='es_editable_en_contrato'
                        checked={formik.values.es_editable_en_contrato}
                        onChange={formik.handleChange}
                        label='Editable en contrato'
                        disabled={esFirmas}
                    />
                    <p className='mt-2 text-xs text-zinc-500'>
                        {esFirmas
                            ? 'Las firmas no son editables en contrato.'
                            : 'Permite ajustes al crear el contrato.'}
                    </p>
                </div>
                <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                    <Checkbox
                        id={`${idPrefix}-obligatoria`}
                        name='es_obligatoria'
                        checked={formik.values.es_obligatoria}
                        onChange={formik.handleChange}
                        label='Obligatoria'
                        disabled={esFirmas}
                    />
                    <p className='mt-2 text-xs text-zinc-500'>
                        {esFirmas
                            ? 'Las firmas siempre son obligatorias.'
                            : 'Mantiene el bloque en la base del contrato.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SeccionForm;
