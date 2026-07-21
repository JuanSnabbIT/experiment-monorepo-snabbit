import type { IConfigPaginaV29, TSlateNode } from '@/interface/plantillaContratoV2.interface';
import { usePreviewHtmlV29Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 900;

interface IUsePreviewV29Result {
    /** null mientras no hay ningún preview exitoso todavía (primera carga). */
    bloques: string[] | null;
    encabezadoHtml: string;
    pieHtml: string;
    /** true mientras hay una request en curso (debounce corriendo o fetch en vuelo). */
    isFetching: boolean;
    error: string | null;
}

/**
 * Debounce + fetch del HTML de vista previa v2.9, solo mientras `activo` es true
 * (modo preview). Stale-while-revalidate: si una request falla o hay una nueva
 * en curso, se sigue devolviendo el último `bloques` exitoso — nunca se vacía
 * el preview por un error o mientras se recalcula, para no generar parpadeo
 * mientras el usuario edita.
 *
 * Mismo patrón de debounce manual (setTimeout + ref, sin librería) que
 * `useContratoWizard.ts` usa para el autoguardado del wizard de contratos.
 */
export default function usePreviewV29(
    plantillaId: number,
    activo: boolean,
    value: TSlateNode[],
    configPagina: IConfigPaginaV29,
    condicionesSimuladas: Record<string, boolean>,
): IUsePreviewV29Result {
    const [trigger] = usePreviewHtmlV29Mutation();
    const [resultado, setResultado] = useState<{ bloques: string[]; encabezado_html: string; pie_html: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const valueKey = JSON.stringify(value);
    const configKey = JSON.stringify(configPagina);
    const condicionesKey = JSON.stringify(condicionesSimuladas);

    useEffect(() => {
        if (!activo) return undefined;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsFetching(true);

        timeoutRef.current = setTimeout(() => {
            trigger({
                plantillaId,
                contenido_documento_v29: JSON.parse(valueKey),
                config_pagina_v29: JSON.parse(configKey),
                condiciones_simuladas: JSON.parse(condicionesKey),
            })
                .unwrap()
                .then((data) => {
                    setResultado(data);
                    setError(null);
                })
                .catch((err: unknown) => {
                    // Se conserva el último `resultado` válido — no se limpia el preview.
                    setError(getErrorMessage(err));
                })
                .finally(() => setIsFetching(false));
        }, DEBOUNCE_MS);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activo, plantillaId, valueKey, configKey, condicionesKey]);

    return {
        bloques: resultado?.bloques ?? null,
        encabezadoHtml: resultado?.encabezado_html ?? '',
        pieHtml: resultado?.pie_html ?? '',
        isFetching,
        error,
    };
}
