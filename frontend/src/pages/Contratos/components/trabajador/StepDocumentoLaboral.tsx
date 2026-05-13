import Label from '@/components/form/Label';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const StepDocumentoLaboral = ({ formik }: Props) => {
    const { values, setFieldValue } = formik;

    return (
        <div className='space-y-4'>
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
        </div>
    );
};

export default StepDocumentoLaboral;
