import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetPlantillasContratoQuery } from '@/store/slices/contratos/plantillaContratoApi';
import {
    useGenerarPdfContratoTrabajadorMutation,
    useUpdateContratoTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

interface ITabDocumentoProps {
    contrato: IContratoTrabajador;
}

/** Fila horizontal: icono + nombre + boton Descargar */
const PdfFileCard = ({ contrato }: { contrato: IContratoTrabajador }) => {
    if (!contrato.archivo_pdf) return null;
    const nombreArchivo = contrato.archivo_pdf.split('/').pop() ?? 'contrato.pdf';
    return (
        <div className='flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50'>
            <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{nombreArchivo}</p>
                <p className='text-xs text-zinc-400 dark:text-zinc-500'>PDF firmado</p>
            </div>
            <Button
                icon='HeroArrowDownTray'
                size='sm'
                onClick={() => window.open(contrato.archivo_pdf!, '_blank')}>
                Descargar
            </Button>
        </div>
    );
};

const TabDocumentoTrabajador = ({ contrato }: ITabDocumentoProps) => {
    const [generarPdf, { isLoading: generando }] = useGenerarPdfContratoTrabajadorMutation();
    const [updateContrato] = useUpdateContratoTrabajadorMutation();

    const [plantillaId, setPlantillaId] = useState<number | ''>(contrato.plantilla_contrato ?? '');

    useEffect(() => {
        setPlantillaId(contrato.plantilla_contrato ?? '');
    }, [contrato.id]);

    const { data: todasLasPlantillas = [] } = useGetPlantillasContratoQuery();
    const plantillasOpciones: TSelectOption[] = todasLasPlantillas
        .filter((p) => p.tipo_contrato === 'trabajador' && p.activa)
        .map((p) => ({ value: String(p.id), label: p.titulo }));
    const plantillaSeleccionada =
        plantillasOpciones.find((o) => o.value === String(plantillaId)) ?? null;

    const tienePdf = !!contrato.archivo_pdf;
    const estado = contrato.estado;
    const esBorrador = estado === 'borrador';
    const esPendienteAceptacion = estado === 'pendiente_aprobacion';
    const esVigente = estado === 'vigente';
    const esTerminado = estado === 'terminado';
    const esAnulado = estado === 'anulado';

    const handleGenerarORegenerarPdf = async () => {
        try {
            if (plantillaId !== contrato.plantilla_contrato) {
                await updateContrato({
                    id: contrato.id,
                    data: { plantilla_contrato: plantillaId || null } as Partial<IContratoTrabajador>,
                }).unwrap();
            }
            await generarPdf(contrato.id).unwrap();
            toast.success(tienePdf ? 'PDF regenerado correctamente' : 'PDF generado correctamente');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Card>
            <CardHeader>Documento del contrato</CardHeader>
            <CardBody>
                {/* Variante A: borrador sin PDF */}
                {esBorrador && !tienePdf && (
                    <div className='space-y-3'>
                        <Alert variant='outline' color='zinc' icon='HeroDocumentText'>
                            Sin documento generado. Configure la plantilla y genere el borrador.
                        </Alert>
                        <div>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Plantilla
                            </p>
                            <SelectReact
                                id='doc_plantilla'
                                name='doc_plantilla'
                                options={plantillasOpciones}
                                value={plantillaSeleccionada}
                                onChange={(opt) =>
                                    setPlantillaId(opt ? Number((opt as TSelectOption).value) : '')
                                }
                                isClearable
                                placeholder='Seleccionar plantilla'
                            />
                        </div>
                        <Button
                            icon='HeroDocumentArrowDown'
                            variant='solid'
                            onClick={handleGenerarORegenerarPdf}
                            isLoading={generando}
                            isDisable={generando || !plantillaId}
                            className='w-full justify-center'>
                            Generar borrador PDF
                        </Button>
                    </div>
                )}

                {/* Variante B: pendiente_aprobacion */}
                {esPendienteAceptacion && (
                    <div className='space-y-3'>
                        <Alert variant='outline' color='blue' icon='HeroClock'>
                            Contrato en espera de firma. No regenerar hasta que sea aceptado o rechazado.
                        </Alert>
                        <PdfFileCard contrato={contrato} />
                        <div className='flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <span>Estado firma: <strong>Pendiente de firma</strong></span>
                        </div>
                    </div>
                )}

                {/* Variante C: borrador con PDF o vigente */}
                {((esBorrador && tienePdf) || esVigente) && (
                    <div className='space-y-3'>
                        <PdfFileCard contrato={contrato} />
                        <div>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Configuracion
                            </p>
                            <SelectReact
                                id='doc_plantilla_c'
                                name='doc_plantilla_c'
                                options={plantillasOpciones}
                                value={plantillaSeleccionada}
                                onChange={(opt) =>
                                    setPlantillaId(opt ? Number((opt as TSelectOption).value) : '')
                                }
                                isClearable
                                placeholder='Seleccionar plantilla'
                                isDisabled={esVigente}
                            />
                        </div>
                        <Button
                            icon='HeroArrowPath'
                            variant='solid'
                            onClick={handleGenerarORegenerarPdf}
                            isLoading={generando}
                            isDisable={generando || !plantillaId}
                            className='w-full justify-center'>
                            Regenerar PDF
                        </Button>
                    </div>
                )}

                {/* Variante D: terminado */}
                {esTerminado && (
                    <div className='space-y-3'>
                        <Alert variant='outline' color='amber' icon='HeroExclamationTriangle'>
                            Contrato terminado. Solo descarga disponible.
                        </Alert>
                        <PdfFileCard contrato={contrato} />
                    </div>
                )}

                {/* Variante E: anulado */}
                {esAnulado && (
                    <div className='space-y-3'>
                        <Alert variant='outline' color='red' icon='HeroNoSymbol'>
                            Contrato anulado. Solo descarga disponible.
                        </Alert>
                        <PdfFileCard contrato={contrato} />
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabDocumentoTrabajador;
