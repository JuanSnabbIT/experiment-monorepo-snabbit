import FileInput from '@/components/form/FileInput';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { useGetPlantillasContratoQuery } from '@/store/slices/contratos/plantillaContratoApi';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const StepDocumentoLaboral = ({ formik }: Props) => {
    const { values, setFieldValue, handleChange, handleBlur } = formik;

    const { data: todasLasPlantillas = [] } = useGetPlantillasContratoQuery();
    const plantillasOpciones: TSelectOption[] = todasLasPlantillas
        .filter((p) => p.tipo_contrato === 'trabajador' && p.activa)
        .map((p) => ({ value: String(p.id), label: p.titulo }));

    const plantillaSeleccionada = plantillasOpciones.find(
        (o) => o.value === String(values.plantilla_contrato_id),
    ) ?? null;

    return (
        <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div>
                    <Label htmlFor='lugar_celebracion_contrato'>Lugar de celebracion del contrato</Label>
                    <Input
                        id='lugar_celebracion_contrato'
                        name='lugar_celebracion_contrato'
                        value={values.lugar_celebracion_contrato}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder='Ej: Santiago, Chile'
                    />
                </div>
                <div>
                    <Label htmlFor='fecha_firma'>Fecha de firma</Label>
                    <Input
                        id='fecha_firma'
                        name='fecha_firma'
                        type='date'
                        value={values.fecha_firma}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
            </div>

            <FileInput
                id='archivo_pdf'
                name='archivo_pdf'
                label='Documento PDF (opcional)'
                accept='application/pdf'
                selectedFile={values.archivo_pdf}
                onFileSelect={(file) => setFieldValue('archivo_pdf', file)}
            />

            <div>
                <Label htmlFor='plantilla_contrato_id'>Plantilla de contrato (opcional)</Label>
                <SelectReact
                    id='plantilla_contrato_id'
                    name='plantilla_contrato_id'
                    options={plantillasOpciones}
                    value={plantillaSeleccionada}
                    onChange={(opt) =>
                        setFieldValue(
                            'plantilla_contrato_id',
                            opt ? Number((opt as TSelectOption).value) : '',
                        )
                    }
                    isClearable
                    placeholder='Usar plantilla default del sistema...'
                />
                <p className='mt-1 text-xs text-zinc-500'>
                    Si no seleccionas ninguna, se usara la plantilla laboral default al generar el
                    PDF.
                </p>
            </div>
        </div>
    );
};

export default StepDocumentoLaboral;
