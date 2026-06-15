import Alert from '@/components/ui/Alert';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';

interface ITabDocumentoProps {
    contrato: IContratoTrabajador;
}

const PdfFileCard = ({ contrato }: { contrato: IContratoTrabajador }) => {
    if (!contrato.archivo_pdf) return null;
    const nombreArchivo = contrato.archivo_pdf.split('/').pop() ?? 'contrato.pdf';
    return (
        <div className='flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50'>
            <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{nombreArchivo}</p>
                <p className='text-xs text-zinc-400 dark:text-zinc-500'>PDF firmado</p>
            </div>
            <a
                href={contrato.archivo_pdf!}
                target='_blank'
                rel='noopener noreferrer'
                download
                className='inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300'>
                Descargar
            </a>
        </div>
    );
};

const TabDocumentoTrabajador = ({ contrato }: ITabDocumentoProps) => {
    const tienePdf = !!contrato.archivo_pdf;
    const estado = contrato.estado;

    return (
        <Card>
            <CardHeader>Documento del contrato</CardHeader>
            <CardBody>
                <div className='space-y-3'>
                    {estado === 'pendiente_aprobacion' && (
                        <Alert variant='outline' color='blue' icon='HeroClock'>
                            Contrato en espera de firma.
                        </Alert>
                    )}
                    {estado === 'terminado' && (
                        <Alert variant='outline' color='amber' icon='HeroExclamationTriangle'>
                            Contrato terminado.
                        </Alert>
                    )}
                    {estado === 'anulado' && (
                        <Alert variant='outline' color='red' icon='HeroNoSymbol'>
                            Contrato anulado.
                        </Alert>
                    )}

                    {tienePdf ? (
                        <PdfFileCard contrato={contrato} />
                    ) : (
                        <p className='text-sm text-zinc-400 dark:text-zinc-500'>
                            Sin documento generado.
                        </p>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabDocumentoTrabajador;
