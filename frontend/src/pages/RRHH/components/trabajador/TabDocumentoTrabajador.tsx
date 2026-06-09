import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetPlantillasContratoQuery } from '@/store/slices/contratos/plantillaContratoApi';
import {
    useGenerarPdfContratoTrabajadorMutation,
    useGetContratoTrabajadorSnapshotBlockQuery,
    useUpdateContratoTrabajadorMutation,
    useUpdateContratoTrabajadorSnapshotBlockMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface ITabDocumentoProps {
    contrato: IContratoTrabajador;
}

const SNAPSHOT_BLOCKS = [
    { path: 'direccion_empresa', label: 'Dirección empresa' },
    { path: 'representante_legal', label: 'Representante legal' },
    { path: 'nombre_trabajador', label: 'Nombre trabajador' },
    { path: 'rut_trabajador', label: 'RUT trabajador' },
    { path: 'direccion_trabajador', label: 'Dirección trabajador' },
] as const;

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
    const [updateSnapshotBlock, { isLoading: guardandoBloque }] =
        useUpdateContratoTrabajadorSnapshotBlockMutation();

    const [plantillaId, setPlantillaId] = useState<number | ''>(contrato.plantilla_contrato ?? '');
    const [blockOpen, setBlockOpen] = useState(false);
    const [editingPath, setEditingPath] = useState<(typeof SNAPSHOT_BLOCKS)[number]['path'] | ''>('');
    const [editingValue, setEditingValue] = useState('');

    useEffect(() => {
        setPlantillaId(contrato.plantilla_contrato ?? '');
    }, [contrato.id]);

    const { data: remoteBlock } = useGetContratoTrabajadorSnapshotBlockQuery(
        { id: contrato.id, path: editingPath },
        { skip: !editingPath || !blockOpen },
    );

    useEffect(() => {
        if (!blockOpen || !editingPath) return;
        const localValue = contrato.snapshot_documento?.[editingPath];
        const nextValue = remoteBlock?.value ?? localValue ?? '';
        setEditingValue(nextValue ?? '');
    }, [blockOpen, editingPath, contrato.snapshot_documento, remoteBlock?.value]);

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
    const snapshotBlocks = useMemo(
        () =>
            SNAPSHOT_BLOCKS.map((block) => ({
                ...block,
                value: contrato.snapshot_documento?.[block.path] ?? null,
            })),
        [contrato.snapshot_documento],
    );

    const openBlockEditor = (path: (typeof SNAPSHOT_BLOCKS)[number]['path']) => {
        setEditingPath(path);
        setBlockOpen(true);
    };

    const closeBlockEditor = () => {
        setBlockOpen(false);
        setEditingPath('');
        setEditingValue('');
    };

    const handleSaveBlock = async () => {
        if (!editingPath) return;
        try {
            await updateSnapshotBlock({
                id: contrato.id,
                path: editingPath,
                value: editingValue.trim() === '' ? '' : editingValue.trim(),
            }).unwrap();
            toast.success('Bloque actualizado correctamente.');
            closeBlockEditor();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

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
                <div className='mb-4 space-y-3'>
                    <div className='flex items-center justify-between gap-3'>
                        <div>
                            <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Snapshot estructurado
                            </p>
                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                Vista por bloques del documento congelado del contrato.
                            </p>
                        </div>
                        {!esBorrador && (
                            <Alert variant='outline' color='amber' icon='HeroClock' className='max-w-fit'>
                                Solo lectura fuera de borrador.
                            </Alert>
                        )}
                    </div>

                    <div className='grid gap-3 md:grid-cols-2'>
                        {snapshotBlocks.map((block) => (
                            <div
                                key={block.path}
                                className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div>
                                        <p className='text-sm font-semibold text-zinc-700 dark:text-zinc-200'>
                                            {block.label}
                                        </p>
                                        <p className='text-xs text-zinc-400 dark:text-zinc-500'>{block.path}</p>
                                    </div>
                                    <Button
                                        size='sm'
                                        icon='HeroPencilSquare'
                                        variant='solid'
                                        color='blue'
                                        isDisable={!esBorrador}
                                        onClick={() => openBlockEditor(block.path)}>
                                        Editar
                                    </Button>
                                </div>
                                <div className='mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/60'>
                                    {block.value || '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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

                <Modal isOpen={blockOpen} setIsOpen={setBlockOpen}>
                    <ModalHeader>Editar bloque del snapshot</ModalHeader>
                    <ModalBody>
                        <div className='space-y-3'>
                            <Alert variant='outline' color='zinc' icon='HeroDocumentText'>
                                TODO RBAC: validar permisos finos por rol antes de editar este bloque.
                            </Alert>
                            <div>
                                <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                    Path
                                </p>
                                <div className='rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50'>
                                    {editingPath || '—'}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor='snapshot_block_value'>Valor</Label>
                                <Input
                                    id='snapshot_block_value'
                                    name='snapshot_block_value'
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    placeholder='Nuevo valor'
                                />
                            </div>
                            <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                Solo se permite editar este snapshot cuando el contrato está en borrador.
                            </p>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='outline' onClick={closeBlockEditor}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            color='blue'
                            onClick={handleSaveBlock}
                            isLoading={guardandoBloque}
                            isDisable={guardandoBloque || !editingPath}>
                            Guardar
                        </Button>
                    </ModalFooter>
                </Modal>
            </CardBody>
        </Card>
    );
};

export default TabDocumentoTrabajador;
