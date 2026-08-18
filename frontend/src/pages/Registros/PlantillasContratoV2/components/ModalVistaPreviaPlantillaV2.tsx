import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/icon/Icon';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import type { IConfigPaginaV29 } from '@/interface/plantillaContratoV2.interface';
import {
    useGetDetallePlantillaV2Query,
    usePreviewHtmlV29Mutation,
} from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import VistaPreviaPaginadaV29 from './VistaPreviaPaginadaV29';

interface IModalVistaPreviaPlantillaV2Props {
    /** id de la plantilla a previsualizar, o null cuando el modal está cerrado */
    plantillaId: number | null;
    onClose: () => void;
}

/**
 * Vista previa rápida de una plantilla guardada, sin salir de la lista.
 * Reutiliza el mismo pipeline que el editor (`preview-html`, con un
 * adaptador de ejemplo generado en el backend — `construir_adaptador_preview`)
 * y el mismo visor paginado (Paged.js) que usa "Vista previa" dentro del
 * editor y que WeasyPrint usa para el PDF real. No inventa datos de muestra
 * en el frontend: los datos vacíos se resuelven en blanco, igual que en el
 * editor.
 */
const ModalVistaPreviaPlantillaV2 = ({ plantillaId, onClose }: IModalVistaPreviaPlantillaV2Props) => {
    const navigate = useNavigate();
    const { data: plantilla, isLoading: isLoadingPlantilla } = useGetDetallePlantillaV2Query(
        plantillaId ?? 0,
        { skip: plantillaId === null },
    );
    const [triggerPreview, { data: preview, isLoading: isRendering }] = usePreviewHtmlV29Mutation();

    useEffect(() => {
        if (!plantilla) return;
        triggerPreview({
            plantillaId: plantilla.id,
            contenido_documento_v29: plantilla.contenido_documento_v29 ?? [],
            config_pagina_v29: plantilla.config_pagina_v29 ?? ({} as IConfigPaginaV29),
            condiciones_simuladas: {},
        })
            .unwrap()
            .catch((err: unknown) => toast.error(getErrorMessage(err)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plantilla?.id]);

    const cargando = isLoadingPlantilla || isRendering;

    return (
        <Modal isOpen={plantillaId !== null} setIsOpen={(open) => !open && onClose()} size='xl'>
            <ModalHeader>
                <div className='flex min-w-0 items-center gap-2.5'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white'>
                        <Icon icon='HeroEye' className='text-base' />
                    </div>
                    <div className='min-w-0'>
                        <p className='text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
                            Vista previa
                        </p>
                        <h2 className='truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                            {plantilla?.titulo ?? 'Cargando...'}
                        </h2>
                    </div>
                    {plantilla && (
                        <Badge variant='outline' color='zinc' className='shrink-0 text-xs'>
                            v{plantilla.version}
                        </Badge>
                    )}
                </div>
            </ModalHeader>
            <ModalBody className='h-[75vh] p-0' isScrollable={false}>
                {cargando ? (
                    <div className='flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-200 dark:bg-zinc-700'>
                        <Icon icon='HeroArrowPath' className='animate-spin text-3xl text-zinc-400' />
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            Generando vista previa...
                        </p>
                    </div>
                ) : (
                    <VistaPreviaPaginadaV29 htmlCompleto={preview?.html_completo ?? null} />
                )}
            </ModalBody>
            <ModalFooter>
                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                    Documento de ejemplo — las etiquetas sin datos reales se muestran vacías.
                </p>
                <ModalFooterChild>
                    <Button variant='default' onClick={onClose}>
                        Cerrar
                    </Button>
                    {plantilla && (
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroPencilSquare'
                            onClick={() => navigate(`/registros/plantillas-contrato/${plantilla.id}`)}>
                            Editar
                        </Button>
                    )}
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default ModalVistaPreviaPlantillaV2;
