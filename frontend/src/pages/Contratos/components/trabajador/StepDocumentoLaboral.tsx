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
                    <Label htmlFor='lugar_firma'>Lugar de firma</Label>
                    <Input
                        id='lugar_firma'
                        name='lugar_firma'
                        value={values.lugar_firma}
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

            <div>
                <Label htmlFor='archivo_pdf'>Documento PDF (opcional)</Label>
                <input
                    id='archivo_pdf'
                    name='archivo_pdf'
                    type='file'
                    accept='application/pdf'
                    onChange={(e) =>
                        setFieldValue('archivo_pdf', e.target.files ? e.target.files[0] : null)
                    }
                    className='block w-full text-sm'
                />
                {values.archivo_pdf && (
                    <p className='text-xs text-zinc-500 mt-1'>
                        Archivo seleccionado: {values.archivo_pdf.name}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor='estado_inicial'>Estado inicial del contrato</Label>
                <div className='mt-1 flex flex-col gap-2'>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input
                            type='radio'
                            name='estado_inicial'
                            value='borrador'
                            checked={values.estado_inicial === 'borrador'}
                            onChange={() => setFieldValue('estado_inicial', 'borrador')}
                        />
                        <span>
                            <strong>Borrador</strong> - quedara en edicion sin notificar al
                            trabajador.
                        </span>
                    </label>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input
                            type='radio'
                            name='estado_inicial'
                            value='pendiente_aceptacion'
                            checked={values.estado_inicial === 'pendiente_aceptacion'}
                            onChange={() =>
                                setFieldValue('estado_inicial', 'pendiente_aceptacion')
                            }
                        />
                        <span>
                            <strong>Pendiente de aceptacion</strong> - el trabajador debera
                            aceptarlo desde el portal.
                        </span>
                    </label>
                </div>
            </div>

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
