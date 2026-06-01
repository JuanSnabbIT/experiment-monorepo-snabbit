// =====================================================================
// Interfaces para el Motor de Plantillas V2 (Slate + Bloques Transversales)
// =====================================================================

// ─── Modelos de negocio ───────────────────────────────────────────

export interface IBloqueTransversalContrato {
    id: number;
    tipo_contrato: string;
    tipo_contrato_label: string;
    codigo: string;
    codigo_label: string;
    titulo: string;
    descripcion: string;
    posicion_default: number;
    editable: boolean;
    activo: boolean;
}

export interface IOrdenBloqueTransversalPlantilla {
    id: number;
    plantilla: number;
    bloque: number;
    bloque_detalle: IBloqueTransversalContrato;
    posicion: number;
    visible: boolean;
}

export interface ISeccionPlantillaV2 {
    id: number;
    plantilla: number;
    titulo: string;
    tipo: string;
    tipo_label: string;
    contenido_template: string;
    /** Nodos Slate serializados como JSON */
    contenido_template_estructurado: TSlateNode[];
    orden: number;
    slot_documental: string | null;
    slot_documental_label: string | null;
    es_editable_en_contrato: boolean;
    es_obligatoria: boolean;
    mostrar_numero: boolean;
}

export interface IPlantillaContratoV2 {
    id: number;
    titulo: string;
    descripcion: string;
    version: number;
    activa: boolean;
    tipo_contrato: string;
    tipo_contrato_label: string;
    empresa_prestadora: number;
    empresa_cliente: number | null;
    empresa_cliente_nombre: string | null;
    es_default: boolean;
    requiere_nda: boolean;
    orden_bloque_alcance: number;
    orden_bloque_operacion: number;
    orden_bloque_condiciones: number;
    secciones: ISeccionPlantillaV2[];
    bloques_transversales: IOrdenBloqueTransversalPlantilla[];
    fecha_creacion: string;
    fecha_modificacion: string;
}

/** Versión ligera para el listado (sin secciones anidadas) */
export interface IPlantillaContratoV2List {
    id: number;
    titulo: string;
    descripcion: string;
    version: number;
    activa: boolean;
    tipo_contrato: string;
    tipo_contrato_label: string;
    empresa_cliente: number | null;
    empresa_cliente_nombre: string | null;
    es_default: boolean;
    requiere_nda: boolean;
    total_secciones: number;
    fecha_creacion: string;
    fecha_modificacion: string;
}

// ─── Payloads de mutaciones ───────────────────────────────────────

export interface ICreatePlantillaV2Payload {
    titulo: string;
    descripcion?: string;
    tipo_contrato: string;
    empresa_cliente?: number | null;
    activa?: boolean;
    requiere_nda?: boolean;
}

export interface IUpdatePlantillaV2Payload extends Partial<ICreatePlantillaV2Payload> {
    id: number;
}

export interface IReordenarSeccionesPayload {
    plantillaId: number;
    orden: { id: number; orden: number }[];
}

export interface IReordenarBloquesPayload {
    plantillaId: number;
    bloques: { bloque: number; posicion: number; visible: boolean }[];
}

// ─── Tipos Slate ─────────────────────────────────────────────────

export interface TMarksTexto {
    bold?: true;
    italic?: true;
    underline?: true;
    code?: true;
    color?: string;
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
    children: [{ text: '' }];
    void: true;
}

/** Union de todos los nodos Slate posibles */
export type TSlateNode =
    | TNodoParrafo
    | TNodoListado
    | TNodoBloqueTransversal
    | TNodoEtiqueta
    | TNodoSaltoPagina;
