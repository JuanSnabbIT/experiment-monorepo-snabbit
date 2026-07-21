/**
 * Helpers Slate para el Motor de Plantillas V2
 *
 * Responsabilidades:
 * - Plugin `withEtiquetas`: declara nodos void/inline para etiquetas y bloques transversales
 * - `insertarEtiqueta`: inserta chip de etiqueta en la posición del cursor
 * - `insertarBloqueTransversal`: inserta bloque void block
 * - `serializarSlateAPlantilla`: Slate nodes → { json, legacyText }
 * - `deserializarPlantillaASlate`: legacyText o JSON → Slate nodes
 */

import type {
    IFirmante,
    TNodoBloqueTransversal,
    TNodoCeldaTabla,
    TNodoCondicional,
    TNodoEtiqueta,
    TNodoFilaTabla,
    TNodoFirma,
    TNodoHeading,
    TNodoParrafo,
    TNodoSaltoPagina,
    TNodoTabla,
    TSlateNode,
} from '@/interface/plantillaContratoV2.interface';
import { Editor, Element, Node, Transforms } from 'slate';

// ─── Plugin: declara nodos void ───────────────────────────────────────────────

export function withEtiquetas<T extends Editor>(editor: T): T {
    const { isVoid, isInline } = editor;

    editor.isVoid = (element) => {
        if (Element.isElement(element)) {
            const t = (element as unknown as { type: string }).type;
            if (t === 'etiqueta' || t === 'bloque_transversal' || t === 'salto_pagina' || t === 'firma')
                return true;
        }
        return isVoid(element);
    };

    editor.isInline = (element) => {
        if (Element.isElement(element)) {
            if ((element as unknown as { type: string }).type === 'etiqueta') return true;
        }
        return isInline(element);
    };

    return editor;
}

// ─── Plugin: normaliza la estructura de tablas ────────────────────────────────

/**
 * Mantiene la forma de las tablas válida: toda celda tiene al menos un bloque
 * de contenido, y todas las filas de una misma tabla tienen el mismo número de
 * celdas (las filas más cortas se rellenan con celdas vacías — nunca se trunca
 * una fila más larga, para no perder contenido ya escrito).
 *
 * Como con `withEtiquetas`, encadena el `normalizeNode` original para CUALQUIER
 * nodo que no sea de tabla — omitir esto rompería la normalización default de
 * Slate (uniones de texto, limpieza de nodos vacíos, etc.) para todo el
 * documento, tenga o no tablas.
 */
export function withTablas<T extends Editor>(editor: T): T {
    const { normalizeNode } = editor;

    editor.normalizeNode = (entry) => {
        const [node, path] = entry;

        if (Element.isElement(node) && (node as { type: string }).type === 'celda_tabla') {
            if ((node as unknown as TNodoCeldaTabla).children.length === 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Transforms.insertNodes(editor, parrafoVacio() as any, { at: [...path, 0] });
                return;
            }
        }

        if (Element.isElement(node) && (node as { type: string }).type === 'tabla') {
            const filas = (node as unknown as TNodoTabla).children;
            const maxCeldas = Math.max(...filas.map((f) => f.children.length));
            for (let i = 0; i < filas.length; i++) {
                if (filas[i].children.length < maxCeldas) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.insertNodes(editor, celdaTablaVacia() as any, {
                        at: [...path, i, filas[i].children.length],
                    });
                    return;
                }
            }
        }

        normalizeNode(entry);
    };

    return editor;
}

// ─── Tabla: helpers de creación ───────────────────────────────────────────────

export function celdaTablaVacia(): TNodoCeldaTabla {
    return { type: 'celda_tabla', children: [parrafoVacio()] };
}

export function filaTablaVacia(cols: number): TNodoFilaTabla {
    return { type: 'fila_tabla', children: Array.from({ length: cols }, celdaTablaVacia) };
}

/**
 * Ancho parejo en px por columna, repartiendo `anchoUtilPx` entre `cols`.
 * `anchoUtilPx` debe ser el ancho de contenido REAL de la página (ancho de
 * hoja menos los márgenes izquierdo/derecho configurados) — pasarlo desde el
 * llamador en vez de adivinarlo acá, que no conoce el tamaño de página elegido.
 */
export function crearTabla(cols: number, rows: number, anchoUtilPx: number): TNodoTabla {
    const anchoCol = Math.max(60, Math.floor(anchoUtilPx / cols));
    return {
        type: 'tabla',
        anchoColumnas: Array.from({ length: cols }, () => anchoCol),
        children: Array.from({ length: rows }, () => filaTablaVacia(cols)),
    };
}

// ─── Insertar etiqueta inline ─────────────────────────────────────────────────

export function insertarEtiqueta(editor: Editor, clave: string): void {
    const nodo: TNodoEtiqueta = {
        type: 'etiqueta',
        clave,
        void: true,
        inline: true,
        children: [{ text: '' }],
    };

    // Si el cursor está al final de un texto, muévelo
    Transforms.insertNodes(editor, nodo as unknown as Node);
    // Mover cursor después del chip
    Transforms.move(editor);
}

// ─── Insertar bloque transversal block ────────────────────────────────────────

export function insertarBloqueTransversal(
    editor: Editor,
    codigo: string,
    titulo: string,
): void {
    const bloque: TNodoBloqueTransversal = {
        type: 'bloque_transversal',
        codigo,
        titulo,
        void: true,
        children: [{ text: '' }],
    };
    // Insertar como bloque separado
    Transforms.insertNodes(editor, bloque as unknown as Node, { mode: 'highest' });
}

// ─── Insertar salto de página ────────────────────────────────────────────────

export function insertarSaltoPagina(editor: Editor): void {
    const nodo: TNodoSaltoPagina = {
        type: 'salto_pagina',
        void: true,
        children: [{ text: '' }],
    };
    Transforms.insertNodes(editor, nodo as unknown as Node, { mode: 'highest' });
    // Insertar párrafo vacío después para continuar escribiendo
    Transforms.insertNodes(editor, parrafoVacio() as unknown as Node);
}

// ─── Firma: normalización hacia atrás ────────────────────────────────────────

/**
 * Devuelve los firmantes de un nodo de firma, sin importar si viene en el
 * formato nuevo (`firmantes`) o en el viejo (`rol` suelto, documentos
 * guardados antes de este mecanismo). Único punto de lectura — evita repetir
 * el fallback en cada lugar que necesita pintar o serializar una firma.
 */
export function obtenerFirmantes(nodo: TNodoFirma): IFirmante[] {
    if (nodo.firmantes) return nodo.firmantes;
    if (nodo.rol) return [{ rol: nodo.rol }];
    return [];
}

// ─── Encabezado/pie: normalización hacia atrás ───────────────────────────────

/**
 * Devuelve el contenido rico (párrafo con marks) de un encabezado o pie, sin
 * importar si viene en el formato nuevo (`contenido`) o en el viejo (`texto`
 * plano, documentos guardados antes de este mecanismo). Único punto de
 * lectura — mismo patrón que `obtenerFirmantes`.
 */
export function obtenerContenidoEncabezadoPie(zona: { contenido?: TSlateNode[]; texto?: string }): TSlateNode[] {
    if (zona.contenido) return zona.contenido;
    if (zona.texto) return [{ type: 'parrafo', children: [{ text: zona.texto }] }];
    return [{ type: 'parrafo', children: [{ text: '' }] }];
}

// ─── Párrafo vacío ───────────────────────────────────────────────────────────

export function parrafoVacio(): TNodoParrafo {
    return { type: 'parrafo', children: [{ text: '' }] };
}

// ─── Serializar Slate → texto legacy ─────────────────────────────────────────

function nodoATexto(nodo: TSlateNode | { text: string }): string {
    if ('text' in nodo) return (nodo as { text: string }).text;

    const n = nodo as TSlateNode;

    if (n.type === 'etiqueta') {
        return `[${(n as TNodoEtiqueta).clave}]`;
    }
    if (n.type === 'bloque_transversal') {
        return `{{${(n as TNodoBloqueTransversal).codigo}}}`;
    }
    if (n.type === 'salto_pagina') {
        return '\n[salto_pagina]\n';
    }
    if (n.type === 'parrafo') {
        return (
            n.children
                .map((c) => nodoATexto(c as TSlateNode | { text: string }))
                .join('') + '\n'
        );
    }
    if (n.type === 'listado') {
        return n.children
            .map((item, i) => {
                const texto = item.children
                    .map((c) => nodoATexto(c as TSlateNode | { text: string }))
                    .join('');
                return n.formato === 'ordenado' ? `${i + 1}. ${texto}\n` : `• ${texto}\n`;
            })
            .join('');
    }
    if (n.type === 'heading') {
        return (
            (n as TNodoHeading).children
                .map((c) => nodoATexto(c as TSlateNode | { text: string }))
                .join('') + '\n'
        );
    }
    if (n.type === 'condicional') {
        return (n as TNodoCondicional).children
            .map((c) => nodoATexto(c as TSlateNode | { text: string }))
            .join('');
    }
    if (n.type === 'firma') {
        const roles = obtenerFirmantes(n as TNodoFirma).map((f) => f.rol);
        return `\n[Firma: ${roles.join(' / ')}]\n`;
    }
    if (n.type === 'tabla') {
        const filas = (n as TNodoTabla).children.map((fila) =>
            fila.children
                .map((celda) =>
                    celda.children
                        .map((c) => nodoATexto(c as TSlateNode | { text: string }))
                        .join('')
                        .replace(/\n+$/, ''),
                )
                .join(' | '),
        );
        return '\n' + filas.join('\n') + '\n';
    }
    return '';
}

/**
 * Convierte nodos Slate al formato doble esperado por el backend:
 * - `json`: string JSON de los nodos (para `contenido_template_estructurado`)
 * - `legacyText`: texto plano con `[claves]` (para `contenido_template`)
 */
export function serializarSlateAPlantilla(nodos: TSlateNode[]): {
    json: string;
    legacyText: string;
} {
    return {
        json: JSON.stringify(nodos),
        legacyText: nodos.map((n) => nodoATexto(n)).join(''),
    };
}

// ─── Deserializar texto legacy → nodos Slate ─────────────────────────────────

const RE_TOKEN = /(\[[^\]]+\]|\{\{[^}]+\}\})/g;

function lineaANodos(linea: string): TSlateNode {
    const trimmed = linea.trim();
    if (trimmed === '[salto_pagina]') {
        return { type: 'salto_pagina', void: true, children: [{ text: '' }] } as TNodoSaltoPagina;
    }
    if (!trimmed) return parrafoVacio();

    const partes = linea.split(RE_TOKEN);
    const children = partes.map((parte) => {
        const etiquetaMatch = parte.match(/^\[([^\]]+)\]$/);
        if (etiquetaMatch) {
            return {
                type: 'etiqueta',
                clave: etiquetaMatch[1],
                void: true,
                inline: true,
                children: [{ text: '' }],
            } as TNodoEtiqueta;
        }
        return { text: parte };
    });

    return { type: 'parrafo', children: children as TNodoParrafo['children'] };
}

/**
 * Convierte el contenido almacenado en Slate nodes.
 * Acepta:
 * - JSON serializado (string que empieza con '[')
 * - Texto legacy con `[claves]`
 * - Array de nodos ya parseados
 */
/**
 * Descarta saltos de página `auto: true` remanentes de una versión anterior
 * del editor v2.9 (paginación por nodos void insertados en el árbol). La
 * paginación actual es puramente visual (offset calculado en el render) y
 * nunca vuelve a insertar este tipo de nodo.
 */
function limpiarSaltosAutoLegados(nodos: TSlateNode[]): TSlateNode[] {
    return nodos.filter(
        (n) => !(n.type === 'salto_pagina' && (n as TNodoSaltoPagina).auto),
    );
}

export function deserializarPlantillaASlate(
    contenido: string | TSlateNode[] | null | undefined,
): TSlateNode[] {
    if (!contenido) return [parrafoVacio()];

    // Ya es un array de nodos
    if (Array.isArray(contenido)) {
        const limpio = limpiarSaltosAutoLegados(contenido);
        return limpio.length > 0 ? limpio : [parrafoVacio()];
    }

    // JSON serializado
    if (typeof contenido === 'string' && contenido.trimStart().startsWith('[')) {
        try {
            const parsed = limpiarSaltosAutoLegados(JSON.parse(contenido) as TSlateNode[]);
            return parsed.length > 0 ? parsed : [parrafoVacio()];
        } catch {
            // Caer a legacy parsing
        }
    }

    // Texto legacy
    const lineas = (contenido as string).split('\n');
    const nodos = lineas.map((l) => lineaANodos(l));
    return nodos.length > 0 ? nodos : [parrafoVacio()];
}
