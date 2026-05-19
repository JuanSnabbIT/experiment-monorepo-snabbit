import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Alert from '@/components/ui/Alert';
import { CONTENIDO_CANONICO_FIRMAS, CONTENIDO_CANONICO_IDENTIFICACION, TIPOS_SECCION } from '@/constants/contrato.constant';
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
    const esIdentificacion = formik.values.tipo === 'identificacion_cliente';
    const esPredeterminada = esFirmas || esIdentificacion;
    const esTituloOSubtitulo = formik.values.tipo === 'titulo' || formik.values.tipo === 'subtitulo';
    const esLibre = formik.values.tipo === 'libre';

    // Forzar valores canónicos cuando el tipo es firmas
    useEffect(() => {
        if (esFirmas) {
            if (formik.values.titulo !== 'Firmas') {
                formik.setFieldValue('titulo', 'Firmas');
            }
            if (formik.values.contenido_template !== CONTENIDO_CANONICO_FIRMAS) {
                formik.setFieldValue('contenido_template', CONTENIDO_CANONICO_FIRMAS);
            }
            if (formik.values.es_editable_en_contrato) {
                formik.setFieldValue('es_editable_en_contrato', false);
            }
            if (!formik.values.es_obligatoria) {
                formik.setFieldValue('es_obligatoria', true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esFirmas]);

    // Forzar valores canónicos cuando el tipo es identificacion_cliente
    useEffect(() => {
        if (esIdentificacion) {
            if (formik.values.titulo !== 'Identificación del Cliente') {
                formik.setFieldValue('titulo', 'Identificación del Cliente');
            }
            if (formik.values.contenido_template !== CONTENIDO_CANONICO_IDENTIFICACION) {
                formik.setFieldValue('contenido_template', CONTENIDO_CANONICO_IDENTIFICACION);
            }
            if (formik.values.es_editable_en_contrato) {
                formik.setFieldValue('es_editable_en_contrato', false);
            }
            if (!formik.values.es_obligatoria) {
                formik.setFieldValue('es_obligatoria', true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esIdentificacion]);

    // Limpiar contenido_template para tipos título/subtítulo (solo tienen título)
    useEffect(() => {
        if (esTituloOSubtitulo && formik.values.contenido_template !== '') {
            formik.setFieldValue('contenido_template', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esTituloOSubtitulo]);

    // Limpiar título para tipo sección libre (solo tiene contenido)
    useEffect(() => {
        if (esLibre && formik.values.titulo !== '') {
            formik.setFieldValue('titulo', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esLibre]);

    return (
        <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {!esLibre && (
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
                                disabled={esPredeterminada}
                            />
                        </Validation>
                    </div>
                )}
                <div className={esLibre ? 'md:col-span-2' : ''}>
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
                    />
                </div>
            </div>

            {esFirmas ? (
                <Alert color='blue' variant='outline' className='text-sm'>
                    <p className='font-semibold'>Zona de firmas (bloque del sistema)</p>
                    <p className='mt-1 text-zinc-500'>
                        El contenido de firmas se genera automáticamente con los datos del
                        contrato. No requiere edición manual.
                    </p>
                </Alert>
            ) : esIdentificacion ? (
                <Alert color='sky' variant='outline' className='text-sm'>
                    <p className='font-semibold'>Identificación del cliente (bloque del sistema)</p>
                    <p className='mt-1 text-zinc-500'>
                        Muestra los datos identificatorios del cliente con sus etiquetas
                        correspondientes. El contenido se completa automáticamente al generar el
                        documento.
                    </p>
                </Alert>
            ) : esTituloOSubtitulo ? (
                <Alert color='zinc' variant='outline' className='text-sm'>
                    <p className='font-semibold'>
                        {formik.values.tipo === 'titulo' ? 'Título de sección' : 'Subtítulo de sección'}
                    </p>
                    <p className='mt-1 text-zinc-500'>
                        Este bloque solo muestra el texto del campo Título. No lleva contenido adicional.
                    </p>
                </Alert>
            ) : (
                <EditorSeccion
                    value={formik.values.contenido_template}
                    onChange={(value) =>
                        formik.setFieldValue('contenido_template', value)
                    }
                    etiquetas={etiquetas}
                    label='Texto base de la sección'
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
                        disabled={esPredeterminada}
                    />
                    <p className='mt-2 text-xs text-zinc-500'>
                        {esFirmas
                            ? 'Las firmas no son editables en contrato.'
                            : esIdentificacion
                              ? 'La identificación del cliente no es editable en contrato.'
                              : 'Permite ajustes posteriores.'}
                    </p>
                </div>
                <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                    <Checkbox
                        id={`${idPrefix}-obligatoria`}
                        name='es_obligatoria'
                        checked={formik.values.es_obligatoria}
                        onChange={formik.handleChange}
                        label='Obligatoria'
                        disabled={esPredeterminada}
                    />
                    <p className='mt-2 text-xs text-zinc-500'>
                        {esFirmas
                            ? 'Las firmas siempre son obligatorias.'
                            : esIdentificacion
                              ? 'La identificación del cliente siempre es obligatoria.'
                              : 'Mantiene el bloque en la base.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SeccionForm;
