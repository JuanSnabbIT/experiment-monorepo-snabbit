"""
Motor de plantillas v2.9 — documento único Slate → HTML → WeasyPrint PDF.

Lee `contenido_documento_v29` (árbol Slate en JSON) de la PlantillaContrato,
traversa los nodos, interpola etiquetas via el adaptador y evalúa bloques
condicionales usando _CONDICIONES_TRABAJADOR del motor v2.

No modifica ni llama a generar_secciones_v2; es un pipeline independiente.
"""

from __future__ import annotations

from html import escape as _esc

from contratos.adaptadores import (
    AdaptadorContratoB2B,
    AdaptadorContratoTrabajador,
    IContratoBase,
)
from contratos.motor_plantillas_v2 import (
    _CONDICIONES_TRABAJADOR,
    resolver_valor_etiqueta_v2,
)

# ─── Inline / leaf ───────────────────────────────────────────────────────────


def _inline_a_html(
    child: dict, adaptador: IContratoBase, contrato, overrides: dict | None = None
) -> str:
    """Convierte un nodo inline: texto con marks o etiqueta inline.

    ``condicional`` es una marca (como bold/italic) aplicable a un fragmento de
    texto suelto dentro de un párrafo — a diferencia del nodo de bloque
    ``condicional`` (ver ``_nodo_a_html``), que sigue soportado para documentos
    guardados antes de este mecanismo.
    """
    if "text" in child:
        if child.get("condicional") and not _evaluar_condicion_v29(
            child["condicional"], contrato, overrides
        ):
            return ""
        text = _esc(str(child["text"]))
        if child.get("bold"):
            text = f"<strong>{text}</strong>"
        if child.get("italic"):
            text = f"<em>{text}</em>"
        if child.get("underline"):
            text = f"<u>{text}</u>"
        if child.get("strikethrough"):
            text = f"<s>{text}</s>"
        if child.get("code"):
            text = f'<code style="font-family:monospace;background:#f4f4f5;padding:0 3px;">{text}</code>'
        if child.get("color"):
            text = f'<span style="color:{_esc(child["color"])}">{text}</span>'
        if child.get("fontSize"):
            text = f'<span style="font-size:{_esc(str(child["fontSize"]))}">{text}</span>'
        return text

    if child.get("type") == "etiqueta":
        clave = child.get("clave", "")
        # Sin try/except propio aguas abajo (resolver_valor_etiqueta_v2 →
        # adaptador.resolver_ruta_extendida): con un adaptador construido sobre
        # datos de ejemplo (vista previa sin persistir) cualquier rama no
        # contemplada puede lanzar — se degrada al placeholder `[clave]` en vez
        # de romper la generación completa del documento.
        try:
            valor = resolver_valor_etiqueta_v2(clave, adaptador, etiquetas_map={})
        except Exception:
            valor = None
        return _esc(str(valor)) if valor is not None else _esc(f"[{clave}]")

    return ""


def _children_a_html(
    children: list, adaptador: IContratoBase, contrato, overrides: dict | None = None
) -> str:
    return "".join(_inline_a_html(c, adaptador, contrato, overrides) for c in children)


# ─── Block nodes ─────────────────────────────────────────────────────────────


def _nodo_a_html(
    nodo: dict, adaptador: IContratoBase, contrato, overrides: dict | None = None
) -> str:
    """Convierte un nodo de bloque Slate a HTML."""
    tipo = nodo.get("type", "")

    if tipo == "parrafo":
        inner = _children_a_html(nodo.get("children", []), adaptador, contrato, overrides)
        align = nodo.get("align", "")
        style = f"text-align:{align};" if align else ""
        return f'<p style="margin:0 0 6pt;{style}">{inner or "&nbsp;"}</p>'

    if tipo == "listado":
        tag = "ol" if nodo.get("formato") == "ordenado" else "ul"
        items_html = "".join(
            f"<li>{_children_a_html(item.get('children', []), adaptador, contrato, overrides)}</li>"
            for item in nodo.get("children", [])
        )
        return f"<{tag}>{items_html}</{tag}>"

    if tipo == "condicional":
        condition = nodo.get("condition", "siempre")
        if not _evaluar_condicion_v29(condition, contrato, overrides):
            return ""
        return "".join(
            _nodo_a_html(c, adaptador, contrato, overrides) for c in nodo.get("children", [])
        )

    if tipo == "firma":
        # 'firmantes' es el formato actual (lista de 1-2 líneas); 'rol' suelto es
        # el formato viejo (documentos guardados antes de este mecanismo).
        firmantes = nodo.get("firmantes") or (
            [{"rol": nodo.get("rol", "")}] if nodo.get("rol") else []
        )
        if not firmantes:
            return ""
        columnas = "".join(
            '<div style="display:inline-block;text-align:center;margin:0 20pt;">'
            '<div style="border-top:1px solid #000;width:180px;margin:0 auto;">&nbsp;</div>'
            f'<div style="font-size:9pt;margin-top:4pt;">{_esc(str(f.get("rol", "")))}</div>'
            "</div>"
            for f in firmantes
        )
        return f'<div style="margin:24pt 0;text-align:center;">{columnas}</div>'

    if tipo == "tabla":
        anchos = nodo.get("anchoColumnas") or []
        colgroup = "".join(f'<col style="width:{a}px;">' for a in anchos)
        filas_html = "".join(
            "<tr>"
            + "".join(
                '<td style="border:1px solid #000;padding:4pt 6pt;vertical-align:top;">'
                + "".join(
                    _nodo_a_html(c, adaptador, contrato, overrides)
                    for c in celda.get("children", [])
                )
                + "</td>"
                for celda in fila.get("children", [])
            )
            + "</tr>"
            for fila in nodo.get("children", [])
        )
        return (
            '<table style="border-collapse:collapse;width:100%;table-layout:fixed;margin:6pt 0;">'
            f"<colgroup>{colgroup}</colgroup><tbody>{filas_html}</tbody></table>"
        )

    if tipo == "salto_pagina":
        return '<div style="page-break-after:always;">&nbsp;</div>'

    if tipo == "heading":
        nivel = int(nodo.get("level", 1))
        tag = f"h{nivel}"
        inner = _children_a_html(nodo.get("children", []), adaptador, contrato, overrides)
        sizes = {1: "14pt", 2: "12pt", 3: "11pt"}
        style = f"font-size:{sizes.get(nivel, '12pt')};font-weight:bold;margin:12pt 0 6pt;"
        if nivel == 2:
            style += "text-transform:uppercase;"
        align = nodo.get("align", "")
        if align:
            style += f"text-align:{align};"
        return f"<{tag} style=\"{style}\">{inner}</{tag}>"

    if tipo in ("bloque_transversal", "etiqueta"):
        # Bloque transversal no aplica en v2.9.
        # Etiqueta a nivel de bloque (inusual): ignorar.
        return ""

    return ""


def _evaluar_condicion_v29(condition: str, contrato, overrides: dict | None = None) -> bool:
    """Evalúa una condición del árbol v2.9 contra el ContratoTrabajador.

    ``overrides`` (Simulador de condicionales del editor): si la clave está
    presente, su valor manda sin evaluar ``fn(contrato)`` — permite previsualizar
    ramas de un condicional aunque el contrato de ejemplo no las active.
    """
    if not condition or condition == "siempre":
        return True
    if overrides and condition in overrides:
        return bool(overrides[condition])
    if contrato is None:
        return True
    fn = _CONDICIONES_TRABAJADOR.get(condition)
    if fn is None:
        return True  # condición desconocida → fail-safe mostrar
    try:
        return bool(fn(contrato))
    except Exception:
        return True


# ─── Documento completo ───────────────────────────────────────────────────────

_PAGE_SIZES = {"a4": "A4", "carta": "letter", "oficio": "legal"}


def _render_zona_html(
    zona: dict, adaptador: IContratoBase, contrato, overrides: dict | None = None
) -> tuple[str, str]:
    """Devuelve (html_interno, align_css) para un encabezado o pie.

    `contenido` (lista de nodos de bloque) es el formato actual — soporta
    marks (negrita/cursiva/etc, vía _nodo_a_html/_inline_a_html, sin cambios
    ahí) y alineación real leída del propio párrafo. `texto` suelto es el
    formato viejo (documentos guardados antes de este mecanismo): sin marks,
    alineación tomada del campo `posicion` legado.
    """
    contenido = zona.get("contenido")
    if contenido:
        html = "".join(_nodo_a_html(n, adaptador, contrato, overrides) for n in contenido)
        align = (contenido[0].get("align") if contenido else None) or "left"
        return html, align

    texto = zona.get("texto", "")
    pos = {"izquierda": "left", "centro": "center", "derecha": "right"}.get(
        zona.get("posicion", "centro"), "center"
    )
    return _esc(texto), pos


def _envolver_en_html(cuerpo: str, config: dict, adaptador: IContratoBase, contrato) -> str:
    """Envuelve el cuerpo HTML en un documento completo listo para WeasyPrint."""
    tamano = _PAGE_SIZES.get(config.get("tamano", "a4"), "A4")
    fuente = config.get("fuente", "Arial, sans-serif")

    enc = config.get("encabezado", {}) or {}
    pie = config.get("pie", {}) or {}

    enc_html = ""
    if enc.get("activo"):
        enc_inner, enc_align = _render_zona_html(enc, adaptador, contrato)
        enc_html = (
            '<div style="border-bottom:1px solid #ccc;padding-bottom:6pt;'
            f'margin-bottom:12pt;font-size:9pt;color:#666;text-align:{enc_align};">'
            f'{enc_inner}</div>'
        )

    pie_html = ""
    if pie.get("activo"):
        pie_inner, pie_align = _render_zona_html(pie, adaptador, contrato)
        pie_html = (
            '<div style="border-top:1px solid #ccc;padding-top:6pt;'
            f'margin-top:12pt;font-size:9pt;color:#666;text-align:{pie_align};">'
            f'{pie_inner}</div>'
        )

    return (
        "<!DOCTYPE html>\n"
        "<html><head><meta charset=\"utf-8\">\n"
        "<style>\n"
        f"@page {{ size: {tamano}; margin: 2.5cm 2.5cm 2cm 2.5cm; }}\n"
        f"body {{ font-family: {fuente}; font-size: 11pt; line-height: 1.5; color: #000; }}\n"
        "p { margin: 0 0 6pt; }\n"
        "ul, ol { margin: 0 0 6pt; padding-left: 20pt; }\n"
        "</style></head>\n"
        "<body>\n"
        f"{enc_html}\n"
        f"{cuerpo}\n"
        f"{pie_html}\n"
        "</body></html>"
    )


def generar_bloques_html_v29(
    nodos: list, adaptador: IContratoBase, contrato, overrides: dict | None = None
) -> list[str]:
    """Convierte cada nodo de bloque top-level a su HTML interpolado.

    Un elemento del resultado por nodo de entrada — usado tal cual por
    ``generar_documento_v29_html`` (PDF real, uniendo el resultado) y por el
    endpoint de vista previa (que necesita el HTML por bloque, no un único
    string, para alinearlo con la paginación calculada en el frontend).
    """
    return [_nodo_a_html(n, adaptador, contrato, overrides) for n in nodos]


def generar_documento_v29_html(plantilla, adaptador: IContratoBase) -> str:
    """
    Punto de entrada público: convierte contenido_documento_v29 a HTML interpolado.

    Retorna un string HTML listo para pasarse a WeasyPrint.
    """
    nodos = plantilla.contenido_documento_v29 or []
    config = plantilla.config_pagina_v29 or {}
    contrato = getattr(adaptador, "instancia", None)

    partes = generar_bloques_html_v29(nodos, adaptador, contrato)
    return _envolver_en_html("\n".join(partes), config, adaptador, contrato)


# ─── Vista previa sin persistir ────────────────────────────────────────────────


def construir_adaptador_preview(plantilla) -> IContratoBase:
    """Arma un adaptador de ejemplo (sin contrato real) según el tipo de plantilla.

    Usado por el endpoint de vista previa del editor: mientras se edita una
    plantilla no hay ningún contrato real al que atarla, así que se construye
    un stub del modelo correspondiente sin guardar. Los adaptadores concretos
    ya defienden sus accesos contra relaciones ``None`` (ver ``resolver_ruta_extendida``
    de cada uno); el único caso que requiere poblar algo a mano es B2B, porque
    ``empresa_prestadora``/``empresa_cliente`` no son ``null=True`` en el modelo.
    """
    tipo = plantilla.tipo_contrato

    # 'finiquito' comparte adaptador con 'trabajador' — mismo criterio que
    # etiquetas_disponibles() (views.py) para el catálogo de etiquetas: los
    # campos finiquito.* se resuelven vía la relación inversa real
    # (contrato.finiquito), no vía un objeto FiniquitoContrato inyectado, así
    # que no hace falta instanciar AdaptadorFiniquito para la vista previa.
    if tipo in ("trabajador", "finiquito"):
        from rrhh.models import ContratoTrabajador

        return AdaptadorContratoTrabajador(ContratoTrabajador())

    if tipo in ("servicios", "venta", "licencia"):
        from contratos.models import ContratoEmpresaCliente

        stub = ContratoEmpresaCliente(
            empresa_prestadora=plantilla.empresa_prestadora,
            empresa_cliente=plantilla.empresa_cliente,
            tipo=tipo,
            nombre=plantilla.titulo or "Vista previa",
        )
        return AdaptadorContratoB2B(stub)

    raise ValueError(f"Tipo de plantilla sin adaptador de preview: {tipo}")


# ─── Congelamiento por contrato ──────────────────────────────────────────────


def generar_o_recongelar_documento_v29(adaptador: IContratoBase):
    """
    Congela (o recongela) el documento v2.9 para el contrato representado por
    ``adaptador``, y devuelve el ``DocumentoContratoGeneradoV29`` vigente.

    Equivalente a ``generar_secciones_v2`` para el editor de secciones v2,
    pero para el documento unico: guarda el HTML ya interpolado en vez de
    volver a leer ``plantilla.contenido_documento_v29`` en vivo en cada
    generacion de PDF.

    Reglas:
    - Si ``fue_editado_manualmente`` es True, nunca se regenera — se respeta
      la edicion manual indefinidamente (igual que ``SeccionContratoGenerada``).
    - Si no existe congelamiento previo, o la version de la plantilla cambio
      desde el ultimo congelamiento, se regenera desde la plantilla en vivo.
    - Si existe y la version no cambio, se reutiliza el HTML guardado sin
      volver a interpolar.
    """
    from contratos.models import ContratoEmpresaCliente, DocumentoContratoGeneradoV29

    plantilla = adaptador.plantilla
    if not plantilla:
        raise ValueError(
            "El adaptador no tiene una plantilla asociada; no se puede congelar el documento v2.9."
        )

    instancia = adaptador.instancia
    es_b2b = isinstance(instancia, ContratoEmpresaCliente)
    # Se filtra tambien por plantilla, no solo por contrato: un mismo
    # ContratoTrabajador puede tener dos documentos v2.9 vigentes a la vez
    # (el del contrato base y el de su finiquito, via AdaptadorFiniquito).
    filtro = (
        {"contrato": instancia, "plantilla": plantilla}
        if es_b2b
        else {"contrato_trabajador": instancia, "plantilla": plantilla}
    )

    documento = DocumentoContratoGeneradoV29.objects.filter(**filtro).first()
    version_actual = str(plantilla.version)

    if documento and documento.fue_editado_manualmente:
        return documento
    if documento and documento.plantilla_version_usada == version_actual:
        return documento

    html = generar_documento_v29_html(plantilla, adaptador)

    if documento:
        documento.html_generado = html
        documento.plantilla_version_usada = version_actual
        documento.save(update_fields=["html_generado", "plantilla_version_usada", "fecha_modificacion"])
    else:
        documento = DocumentoContratoGeneradoV29.objects.create(
            html_generado=html,
            plantilla_version_usada=version_actual,
            **filtro,
        )
    return documento
