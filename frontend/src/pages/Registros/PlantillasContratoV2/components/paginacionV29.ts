/**
 * Constantes y algoritmo de paginación compartidos entre el editor (Slate,
 * mide su propio DOM vía ReactEditor.toDOMNode) y la vista previa (HTML del
 * backend, mide divs planos) — ambos necesitan el mismo criterio de "cuándo
 * corta una página", solo cambia de dónde sacan la altura de cada bloque.
 */

export const PAGE_CONFIGS: Record<string, { widthPx: number; heightPx: number }> = {
    carta: { widthPx: 816, heightPx: 1056 },
};
export const PAGE_PADDING = 80; // px vertical margen de página
export const PAGE_GAP = 20; // px espacio gris entre tarjetas de página

/** Punto de corte de página: el bloque en `index` recibe `marginTop`/`paddingTop`: offsetPx. */
export interface IPaginationBreak {
    index: number;
    offsetPx: number;
}

export interface INodoAltura {
    /** Altura real del bloque (sin ningún offset de paginación ya aplicado). */
    height: number;
    /** true si este nodo es un salto de página manual — fuerza el corte siguiente. */
    esSaltoPagina: boolean;
}

/**
 * Dado un array de alturas (una por nodo top-level, en el mismo orden que el
 * documento) y el alto útil de página, devuelve los puntos de corte.
 *
 * Mismo algoritmo que ya validó el editor: acumula altura hasta que el
 * siguiente nodo no entra en el espacio restante de la página actual, ahí
 * corta — el nodo que no entró recibe `offsetPx` (el espacio sobrante de la
 * página que termina + la zona de encabezado/pie/gap entre tarjetas) para
 * que visualmente arranque al principio de la página siguiente. Un salto de
 * página manual fuerza el corte en el nodo siguiente sin importar cuánto
 * espacio quede.
 */
export function calcularCortesDesdeAlturas(
    nodos: INodoAltura[],
    bodyHeight: number,
    zonaSeparador: number,
): IPaginationBreak[] {
    const cortes: IPaginationBreak[] = [];
    let acumulado = 0;
    const indicesConCorte = new Set<number>();

    nodos.forEach((nodo, i) => {
        if (nodo.esSaltoPagina) {
            const sobrante = bodyHeight - acumulado;
            if (i + 1 < nodos.length && !indicesConCorte.has(i + 1)) {
                cortes.push({ index: i + 1, offsetPx: sobrante + zonaSeparador });
                indicesConCorte.add(i + 1);
            }
            acumulado = 0;
            return;
        }

        const nodeH = nodo.height;
        if (acumulado > 0 && acumulado + nodeH > bodyHeight && !indicesConCorte.has(i)) {
            const sobrante = bodyHeight - acumulado;
            cortes.push({ index: i, offsetPx: sobrante + zonaSeparador });
            indicesConCorte.add(i);
            acumulado = nodeH;
        } else {
            acumulado += nodeH;
        }
    });

    return cortes;
}
