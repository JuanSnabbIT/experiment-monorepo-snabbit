import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetPlantillasContratoQuery } from '@/store/slices/contratos/plantillaContratoApi';
import {
    useGenerarPdfContratoTrabajadorMutation,
    useUpdateContratoTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

interface ITabDocumentoProps {
    contrato: IContratoTrabajador;
}

const TabDocumentoTrabajador = ({ contrato }: ITabDocumentoProps) => {
    const [generarPdf, { isLoading: generando }] = useGenerarPdfContratoTrabajadorMutation();
    const [updateContrato, { isLoading: actualizando }] = useUpdateContratoTrabajadorMutation();

    // Formulario de configuracion del documento
    const [lugar, setLugar] = useState(contrato.lugar_firma ?? '');
    const [fecha, setFecha] = useState(contrato.fecha_firma ?? '');
    const [plantillaId, setPlantillaId] = useState<number | ''>(contrato.plantilla_contrato ?? '');
    const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar si el contrato cambia (ej: navegacion entre contratos)
    useEffect(() => {
        setLugar(contrato.lugar_firma ?? '');
        setFecha(contrato.fecha_firma ?? '');
        setPlantillaId(contrato.plantilla_contrato ?? '');
    }, [contrato.id]);

    const { data: todasLasPlantillas = [] } = useGetPlantillasContratoQuery();
    const plantillasOpciones: TSelectOption[] = todasLasPlantillas
        .filter((p) => p.tipo_contrato === 'trabajador' && p.activa)
        .map((p) => ({ value: String(p.id), label: p.titulo }));
    const plantillaSeleccionada =
        plantillasOpciones.find((o) => o.value === String(plantillaId)) ?? null;

    const handleGenerarPdf = async () => {
        try {
            await generarPdf(contrato.id).unwrap();
            toast.success('PDF generado correctamente');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleGuardarConfiguracion = async () => {
        try {
            await updateContrato({
                id: contrato.id,
                data: {
                    lugar_firma: lugar || null,
                    fecha_firma: fecha || null,
                    plantilla_contrato: plantillaId || null,
                } as Partial<IContratoTrabajador>,
            }).unwrap();
            toast.success('Configuracion guardada');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleSubirPdf = async () => {
        if (!archivoPdf) return;
        const fd = new FormData();
        fd.append('archivo_pdf', archivoPdf);
        try {
            await updateContrato({ id: contrato.id, data: fd }).unwrap();
            toast.success('PDF subido correctamente');
            setArchivoPdf(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>Documento del Contrato</CardHeader>
                <CardBody>
                    <div className='space-y-4'>
                        <div className='flex flex-wrap gap-3'>
                            <Button
                                icon='HeroDocumentArrowDown'
                                onClick={handleGenerarPdf}
                                isLoading={generando}
                                isDisable={generando}>
                                Generar PDF
                            </Button>
                            {contrato.archivo_pdf && (
                                <Button
                                    icon='HeroEye'
                                    onClick={() => window.open(contrato.archivo_pdf!, '_blank')}>
                                    Ver PDF actual
                                </Button>
                            )}
                        </div>
                        {!contrato.archivo_pdf && (
                            <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                No hay PDF generado. Usa el boton para generar el documento.
                            </p>
                        )}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>Configuracion del documento</CardHeader>
                <CardBody>
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='doc_plantilla'>Plantilla de contrato</Label>
                            <SelectReact
                                id='doc_plantilla'
                                options={plantillasOpciones}
                                value={plantillaSeleccionada}
                                onChange={(opt) =>
                                    setPlantillaId(
                                        opt ? Number((opt as TSelectOption).value) : '',
                                    )
                                }
                                isClearable
                                placeholder='Usar plantilla default del sistema...'
                            />
                            <p className='mt-1 text-xs text-zinc-500'>
                                Si no seleccionas una plantilla, se usara la plantilla default de la
                                empresa.
                            </p>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <div>
                                <Label htmlFor='doc_lugar_firma'>Lugar de firma</Label>
                                <Input
                                    id='doc_lugar_firma'
                                    value={lugar}
                                    onChange={(e) => setLugar(e.target.value)}
                                    placeholder='Ej: Santiago, Chile'
                                />
                            </div>
                            <div>
                                <Label htmlFor='doc_fecha_firma'>Fecha de firma</Label>
                                <Input
                                    id='doc_fecha_firma'
                                    type='date'
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            variant='solid'
                            onClick={handleGuardarConfiguracion}
                            isLoading={actualizando}
                            isDisable={actualizando}>
                            Guardar configuracion
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>Subir PDF manualmente</CardHeader>
                <CardBody>
                    <div className='space-y-3'>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            Puedes subir un PDF firmado manualmente para reemplazar el documento
                            generado.
                        </p>
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='application/pdf'
                            onChange={(e) =>
                                setArchivoPdf(e.target.files ? e.target.files[0] : null)
                            }
                            className='block w-full text-sm'
                        />
                        {archivoPdf && (
                            <p className='text-xs text-zinc-500'>
                                Archivo seleccionado: {archivoPdf.name}
                            </p>
                        )}
                        <Button
                            icon='HeroArrowUpTray'
                            onClick={handleSubirPdf}
                            isDisable={!archivoPdf || actualizando}
                            isLoading={actualizando}>
                            Subir PDF
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default TabDocumentoTrabajador;
