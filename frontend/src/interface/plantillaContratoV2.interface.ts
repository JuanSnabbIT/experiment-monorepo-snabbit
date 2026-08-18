// =====================================================================
// Interfaces para el Motor de Plantillas V2.9 (documento único Slate)
// =====================================================================

// ─── Configuración de página v2.9 ────────────────────────────────

export interface IConfigPaginaV29 {
    tamano: 'carta';
    fuente: string;
    encabezado: {
        activo: boolean;
        /** Contenido rico (párrafo con marks) — reemplaza `texto` de a poco. */
        contenido?: TSlateNode[];
        /** @deprecated usar `contenido` — compat con documentos guardados antes de este cambio. */
        texto?: string;
        logo_auto: boolean;
        /** Margen al que se ancla el logo, independiente del `align` del texto. */
        logo_lado: 'izquierda' | 'derecha';
    };
    pie: {
        activo: boolean;
        /** Contenido rico (párrafo con marks) — reemplaza `texto` de a poco. */
        contenido?: TSlateNode[];
        /** @deprecated usar `contenido`. */
        texto?: string;
        numeracion: boolean;
        /** @deprecated la alineación real vive en contenido[0].align; se lee solo si `contenido` no existe. */
        posicion?: 'izquierda' | 'centro' | 'derecha';
    };
}

export interface IPlantillaContratoV2 {
    id: number;
    titulo: string;
    descripcion: string;
    version: number;
    activa: boolean;
    tipo_contrato: string;
    tipo_contrato_label: string;
    subtipo_trabajador: string | null;
    subtipo_trabajador_label: string | null;
    empresa_prestadora: number;
    empresa_cliente: number | null;
    empresa_cliente_nombre: string | null;
    es_default: boolean;
    requiere_nda: boolean;
    orden_bloque_alcance: number;
    orden_bloque_operacion: number;
    orden_bloque_condiciones: number;
    /** 'v2' = editor de secciones (legado); 'v29' = documento único Slate */
    version_editor: 'v2' | 'v29';
    contenido_documento_v29: TSlateNode[] | null;
    config_pagina_v29: IConfigPaginaV29 | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

/** Versión ligera para el listado (sin secciones anidadas ni JSON pesado) */
export interface IPlantillaContratoV2List {
    id: number;
    titulo: string;
    descripcion: string;
    version: number;
    activa: boolean;
    tipo_contrato: string;
    tipo_contrato_label: string;
    subtipo_trabajador: string | null;
    subtipo_trabajador_label: string | null;
    empresa_prestadora: number | null;
    empresa_cliente: number | null;
    empresa_cliente_nombre: string | null;
    es_default: boolean;
    requiere_nda: boolean;
    version_editor: 'v2' | 'v29';
    total_contratos_emitidos: number;
    fecha_creacion: string;
    fecha_modificacion: string;
}

// ─── Payloads de mutaciones ───────────────────────────────────────

export interface ICreatePlantillaV2Payload {
    titulo: string;
    descripcion?: string;
    tipo_contrato: string;
    subtipo_trabajador?: string | null;
    empresa_cliente?: number | null;
    activa?: boolean;
    requiere_nda?: boolean;
    version_editor?: 'v2' | 'v29';
}

export interface IUpdatePlantillaV2Payload extends Partial<ICreatePlantillaV2Payload> {
    id: number;
    contenido_documento_v29?: TSlateNode[] | null;
    config_pagina_v29?: IConfigPaginaV29 | null;
}

export interface IPreviewHtmlV29Payload {
    plantillaId: number;
    contenido_documento_v29: TSlateNode[];
    config_pagina_v29: IConfigPaginaV29;
    condiciones_simuladas: Record<string, boolean>;
}

export interface IPreviewHtmlV29Response {
    /** HTML interpolado por el backend, uno por nodo top-level de contenido_documento_v29 (mismo orden/índice). */
    bloques: string[];
    encabezado_html: string;
    pie_html: string;
    /** Documento completo (con <style>/@page — mismo CSS que usará WeasyPrint
     *  para el PDF real) — lo consume VistaPreviaPaginadaV29 (Paged.js) para
     *  la paginación real del modo "Vista previa". */
    html_completo: string;
}

// ─── Tipos Slate ─────────────────────────────────────────────────

export interface TMarksTexto {
    bold?: true;
    italic?: true;
    underline?: true;
    strikethrough?: true;
    code?: true;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
    /** Clave de condición del motor v2 (ej. 'solo_reemplazo') aplicada a un fragmento de texto. */
    condicional?: string;
}

export interface TNodoEtiqueta {
    type: 'etiqueta';
    clave: string;
    /** Texto visible en el chip, ej: "[nombre_cliente]" */
    children: [{ text: '' }];
    void: true;
    inline: true;
}

export interface TNodoBloqueTransversal {
    type: 'bloque_transversal';
    codigo: string;
    titulo: string;
    children: [{ text: '' }];
    void: true;
}

export interface TNodoHeading {
    type: 'heading';
    level: 1 | 2 | 3;
    align?: 'left' | 'center' | 'right' | 'justify';
    children: (TNodoTexto | TNodoEtiqueta)[];
}

export interface TNodoParrafo {
    type: 'parrafo';
    align?: 'left' | 'center' | 'right' | 'justify';
    children: (TNodoTexto | TNodoEtiqueta)[];
}

export interface TNodoListado {
    type: 'listado';
    formato: 'ordenado' | 'desordenado';
    children: TNodoItemListado[];
}

export interface TNodoItemListado {
    type: 'item-listado';
    children: (TNodoTexto | TNodoEtiqueta)[];
}

export interface TNodoTexto extends TMarksTexto {
    text: string;
}

export interface TNodoSaltoPagina {
    type: 'salto_pagina';
    auto?: boolean;
    children: [{ text: '' }];
    void: true;
}

/** Bloque condicional: solo se renderiza si la condición evalúa true en el contrato */
export interface TNodoCondicional {
    type: 'condicional';
    /** Clave de condición del motor v2: 'solo_plazo_fijo' | 'si_isapre' | etc. */
    condition: string;
    label?: string;
    children: TSlateNode[];
}

/** Un firmante dentro de un bloque de firma (una línea + su label) */
export interface IFirmante {
    rol: string;
}

/**
 * Bloque de firma con 1 o 2 líneas lado a lado. `rol` (legado, sin `firmantes`)
 * sigue soportado para documentos guardados antes de este mecanismo — ver
 * `obtenerFirmantes()` en `utils/slatePlantillas.ts`.
 */
export interface TNodoFirma {
    type: 'firma';
    firmantes?: IFirmante[];
    /** @deprecated usar `firmantes` — se mantiene solo por compatibilidad con documentos viejos */
    rol?: string;
    children: [{ text: '' }];
    void: true;
}

/** Subtipos soportados de bloque dinámico — uno por tabla de datos obligatorios B2B. */
export type TSubtipoBloqueDinamico =
    | 'servicios'
    | 'cotizacion_venta'
    | 'licencias'
    | 'condiciones_especiales'
    | 'resumen_comercial';

/**
 * Bloque dinámico (servicios/licencias/condiciones especiales/resumen
 * comercial): placeholder — NUNCA almacena el contenido de la tabla, se
 * resuelve siempre contra los datos reales del contrato en el backend
 * (`motor_v29.py::_bloque_dinamico_html`), igual que el motor viejo resuelve
 * `TIPOS_BLOQUE_DINAMICO`. Solo insertable/movible/eliminable, no editable
 * como texto — ver `renderElement` en `EditorDocumentoV29.tsx`.
 */
export interface TNodoBloqueDinamico {
    type: 'bloque_dinamico';
    subtipo: TSubtipoBloqueDinamico;
    children: [{ text: '' }];
    void: true;
}

/** Celda de tabla: contiene bloques de contenido (normalmente 1+ párrafos) */
export interface TNodoCeldaTabla {
    type: 'celda_tabla';
    children: TSlateNode[];
}

/** Fila de tabla: una o más celdas — todas las filas de una tabla deben tener
 * el mismo número de celdas (garantizado por el plugin de normalización). */
export interface TNodoFilaTabla {
    type: 'fila_tabla';
    children: TNodoCeldaTabla[];
}

/**
 * Tabla estilo Word: filas de igual cantidad de celdas. `anchoColumnas` guarda
 * el ancho en px de cada columna (mismo orden que las celdas de cada fila) —
 * vive en la tabla, no en cada celda, y se actualiza al redimensionar arrastrando
 * el borde entre columnas o al agregar/quitar una columna.
 */
export interface TNodoTabla {
    type: 'tabla';
    anchoColumnas: number[];
    children: TNodoFilaTabla[];
}

/** Union de todos los nodos Slate posibles */
export type TSlateNode =
    | TNodoParrafo
    | TNodoHeading
    | TNodoListado
    | TNodoBloqueTransversal
    | TNodoEtiqueta
    | TNodoSaltoPagina
    | TNodoCondicional
    | TNodoFirma
    | TNodoBloqueDinamico
    | TNodoTabla
    | TNodoFilaTabla
    | TNodoCeldaTabla;
