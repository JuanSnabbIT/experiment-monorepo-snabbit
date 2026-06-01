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
    TNodoBloqueTransversal,
    TNodoEtiqueta,
    TNodoParrafo,
    TNodoSaltoPagina,
    TSlateNode,
} from '@/interface/plantillaContratoV2.interface';
import { Editor, Element, Node, Transforms } from 'slate';

// ─── Plugin: declara nodos void ───────────────────────────────────────────────

export function withEtiquetas<T extends Editor>(editor: T): T {
    const { isVoid, isInline } = editor;

    editor.isVoid = (element) => {
        if (Element.isElement(element)) {
            const t = (element as unknown as { type: string }).type;
            if (t === 'etiqueta' || t === 'bloque_transversal' || t === 'salto_pagina')
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
export function deserializarPlantillaASlate(
    contenido: string | TSlateNode[] | null | undefined,
): TSlateNode[] {
    if (!contenido) return [parrafoVacio()];

    // Ya es un array de nodos
    if (Array.isArray(contenido)) {
        return contenido.length > 0 ? contenido : [parrafoVacio()];
    }

    // JSON serializado
    if (typeof contenido === 'string' && contenido.trimStart().startsWith('[')) {
        try {
            const parsed = JSON.parse(contenido) as TSlateNode[];
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
