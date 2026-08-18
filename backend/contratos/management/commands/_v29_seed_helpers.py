"""Helpers compartidos para seed commands que generan plantillas v2.9 (Slate).

No es un management command en si (el prefijo ``_`` evita que Django lo
registre como uno) — solo funciones reutilizadas por los seed commands que
antes creaban plantillas v2 (SeccionPlantilla) y ahora crean documentos v2.9.
"""

import re

_PATRON_ETIQUETA = re.compile(r'(\[[a-z_.]+\])')
_PATRON_CLAVE = re.compile(r'\[([a-z_.]+)\]')


def etiqueta(clave: str) -> dict:
    return {"type": "etiqueta", "clave": clave, "children": [{"text": ""}], "void": True, "inline": True}


def parrafo_desde_texto(texto: str, align: str | None = None) -> dict:
    """Convierte un texto con [etiquetas] estilo legacy en un parrafo Slate,
    alternando nodos de texto y nodos de etiqueta inline."""
    partes = _PATRON_ETIQUETA.split(texto)
    children = []
    for parte in partes:
        if not parte:
            continue
        m = _PATRON_CLAVE.fullmatch(parte)
        children.append(etiqueta(m.group(1)) if m else {"text": parte})
    if not children:
        children = [{"text": ""}]
    nodo = {"type": "parrafo", "children": children}
    if align:
        nodo["align"] = align
    return nodo


def parrafos_desde_texto_multilinea(texto: str) -> list:
    """Divide un texto largo en varios parrafos Slate por linea en blanco."""
    bloques = [b.strip() for b in texto.split("\n\n") if b.strip()]
    return [parrafo_desde_texto(b) for b in bloques] or [parrafo_desde_texto(texto)]


def heading(nivel: int, texto: str, align: str | None = None) -> dict:
    nodo = {"type": "heading", "level": nivel, "children": [{"text": texto}]}
    if align:
        nodo["align"] = align
    return nodo


def condicional(condition: str, *children: dict) -> dict:
    return {"type": "condicional", "condition": condition, "children": list(children)}


def firma(*roles: str) -> dict:
    return {
        "type": "firma",
        "firmantes": [{"rol": rol} for rol in roles],
        "children": [{"text": ""}],
        "void": True,
    }


def config_pagina_basica(pie_texto: str = "") -> dict:
    return {
        "tamano": "carta",
        "fuente": "Arial, sans-serif",
        "encabezado": {
            "activo": True,
            "contenido": [{"type": "parrafo", "children": [{"text": ""}]}],
            "logo_auto": True,
            "logo_lado": "izquierda",
        },
        "pie": {
            "activo": True,
            "contenido": [{"type": "parrafo", "children": [{"text": pie_texto}], "align": "center"}],
            "numeracion": True,
        },
    }


def documento_desde_secciones(titulo_documento: str, secciones: list, roles_firma: tuple = ("Empleador", "Trabajador")) -> list:
    """Arma un documento Slate completo a partir de una lista de secciones
    ``{"titulo": str, "contenido_template": str}`` (mismo shape que las
    SECCIONES_* que usaban los seed commands v2/legacy).
    """
    documento = [heading(1, titulo_documento, align="center")]
    for sec in secciones:
        documento.append(heading(3, sec["titulo"]))
        documento.extend(parrafos_desde_texto_multilinea(sec["contenido_template"]))
    documento.append(firma(*roles_firma))
    return documento


def documento_desde_secciones_condicionales(secciones: list, roles_firma: tuple = ("Empleador", "Trabajador")) -> list:
    """Variante para plantillas laborales con ``condicion_aparicion`` por
    sección (tipos especiales ``titulo``/``firmas`` sin cuerpo de texto).
    Cada sección envuelta en un nodo ``condicional`` salvo que su condición
    sea ``"siempre"``.
    """
    documento = []
    for sec in secciones:
        condicion = sec.get("condicion_aparicion", "siempre")
        tipo = sec.get("tipo", "clausula")

        if tipo == "titulo":
            bloque = [heading(1, sec["titulo"], align="center")]
        elif tipo == "firmas":
            bloque = [firma(*roles_firma)]
        else:
            bloque = [heading(3, sec["titulo"])]
            bloque.extend(parrafos_desde_texto_multilinea(sec["contenido_template"]))

        if condicion and condicion != "siempre":
            documento.append(condicional(condicion, *bloque))
        else:
            documento.extend(bloque)

    return documento
