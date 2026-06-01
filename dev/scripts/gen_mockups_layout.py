"""
Genera los 30 mockups (5 estados x 6 tabs) en dev/docs/detalle-contrato-plan.html
Uso: python dev/scripts/gen_mockups_layout.py
"""
import os
import sys

TARGET = os.path.join(os.path.dirname(__file__), '..', 'docs', 'detalle-contrato-plan.html')

# ─── Datos de cada estado ─────────────────────────────────────────────────────
ESTADOS = [
    dict(
        id='1045', name='María López', initials='ML', avatar_bg='#334155',
        chip='chip-borrador', label='BORRADOR',
        tipo='Indefinido', fechas='Inicio: 01/10/2025 · Sin término', firmas=None,
        stepper_html=(
            '<div class="msp-item active">● Borrador</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Pend. aceptación</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Vigente</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Terminado</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Anulado</div>'
        ),
        btns_html=(
            '<div class="mock-icon-btn" style="font-size:9px">👁 Vista previa</div>'
            '<div class="mock-prim-btn" style="font-size:9px">→ Enviar a firma</div>'
        ),
    ),
    dict(
        id='1044', name='Carlos Rojas', initials='CR', avatar_bg='#0891b2',
        chip='chip-pendiente', label='PEND. ACEPTACIÓN',
        tipo='Plazo fijo', fechas='01/11/2025 – 01/11/2026', firmas='0/1',
        stepper_html=(
            '<div class="msp-item done">✓ Borrador</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item active">● Pend. aceptación</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Vigente</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Terminado</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Anulado</div>'
        ),
        btns_html=(
            '<div class="mock-prim-btn" style="font-size:9px;background:#dc2626">✕ Cancelar envío</div>'
            '<span style="font-size:8px;color:#f59e0b;padding:0 4px">⌛ Esperando firma</span>'
        ),
    ),
    dict(
        id='1043', name='Ana Torres', initials='AT', avatar_bg='#7c3aed',
        chip='chip-vigente', label='VIGENTE',
        tipo='Plazo fijo', fechas='01/02/2025 – 15/02/2026', firmas='1/1',
        stepper_html=(
            '<div class="msp-item done">✓ Borrador</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item done">✓ Pend. aceptación</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item active">● Vigente</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Terminado</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Anulado</div>'
        ),
        btns_html=(
            '<div class="mock-prim-btn" style="font-size:9px;background:#f59e0b">⏸ Suspender</div>'
            '<div class="mock-prim-btn" style="font-size:9px;background:#ef4444">✕ Terminar</div>'
            '<div class="mock-icon-btn" style="font-size:9px">↻ Renovar</div>'
            '<div class="mock-prim-btn" style="font-size:9px">📄 PDF</div>'
        ),
    ),
    dict(
        id='1041', name='Jorge Mora', initials='JM', avatar_bg='#6366f1',
        chip='chip-terminado', label='TERMINADO',
        tipo='Plazo fijo', fechas='01/03/2024 – 28/02/2025', firmas='1/1',
        stepper_html=(
            '<div class="msp-item done">✓ Borrador</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item done">✓ Pend. aceptación</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item done">✓ Vigente</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item active">● Terminado</div>'
            '<div class="msp-line todo"></div>'
            '<div class="msp-item todo">Anulado</div>'
        ),
        btns_html=(
            '<div class="mock-icon-btn" style="font-size:9px">↻ Renovar</div>'
            '<div class="mock-prim-btn" style="font-size:9px">📄 PDF</div>'
        ),
    ),
    dict(
        id='1039', name='Sofía Vargas', initials='SV', avatar_bg='#dc2626',
        chip='chip-anulado', label='ANULADO',
        tipo='Indefinido', fechas='Inicio: 01/06/2024 · Anulado: 15/03/2025', firmas='1/1',
        stepper_html=(
            '<div class="msp-item done">✓ Borrador</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item done">✓ Pend. aceptación</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item done">✓ Vigente</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item todo">Terminado</div>'
            '<div class="msp-line done"></div>'
            '<div class="msp-item active">● Anulado</div>'
        ),
        btns_html='<div class="mock-prim-btn" style="font-size:9px">📄 PDF</div>',
    ),
]

TABS = ['Datos contrato', 'Trabajador', 'Remuneraciones', 'Documento', 'Anexos', 'Historial']

# ─── Datos adicionales por estado ─────────────────────────────────────────────
DATOS_CONTRATO = {
    '1045': dict(cargo='Analista de Soporte', tipo='Indefinido', jornada='Completa · 45h',
                 inicio='01/10/2025', termino='–', lugar='Sucursal Norte',
                 funciones='Atención y resolución de incidencias técnicas de usuarios internos.',
                 note=None, nota_type=None, can_edit=True),
    '1044': dict(cargo='Ingeniero DevOps', tipo='Plazo fijo', jornada='Completa · 45h',
                 inicio='01/11/2025', termino='01/11/2026', lugar='Casa Matriz',
                 funciones='Gestión de infraestructura CI/CD y automatización de despliegues.',
                 note='🔒 Datos bloqueados mientras espera firma del trabajador', nota_type='info', can_edit=False),
    '1043': dict(cargo='Analista TI', tipo='Plazo fijo', jornada='Completa · 45h',
                 inicio='01/02/2025', termino='15/02/2026', lugar='Casa Matriz',
                 funciones='Soporte técnico nivel 2, gestión de infraestructura y servidores.',
                 note=None, nota_type=None, can_edit=True),
    '1041': dict(cargo='Técnico en Redes', tipo='Plazo fijo', jornada='Completa · 45h',
                 inicio='01/03/2024', termino='28/02/2025', lugar='Casa Matriz',
                 funciones='Instalación y mantenimiento de redes LAN/WAN.',
                 note='⚠ Contrato terminado el 28/02/2025. Solo lectura.', nota_type='warn', can_edit=False),
    '1039': dict(cargo='Coord. RRHH', tipo='Indefinido', jornada='Completa · 45h',
                 inicio='01/06/2024', termino='–', lugar='Sucursal Sur',
                 funciones='Coordinación de procesos de selección y onboarding.',
                 note='🚫 Contrato anulado el 15/03/2025. Solo lectura.', nota_type='anulado', can_edit=False),
}

DATOS_TRABAJADOR = {
    '1045': dict(nombre='María López Soto', rut='12.345.678-9', nacimiento='22/06/1985',
                 nacionalidad='Chilena', email='m.lopez@techcorp.cl', tel='+56 9 1234 5678',
                 direccion='Calle Falsa 123, Santiago'),
    '1044': dict(nombre='Carlos Rojas Muñoz', rut='15.678.234-K', nacimiento='08/11/1992',
                 nacionalidad='Chileno', email='c.rojas@techcorp.cl', tel='+56 9 2345 6789',
                 direccion='Los Olivos 456, Viña del Mar'),
    '1043': dict(nombre='Ana Torres García', rut='13.567.890-2', nacimiento='12/03/1990',
                 nacionalidad='Chilena', email='a.torres@techcorp.cl', tel='+56 9 8765 4321',
                 direccion='Av. Principal 456, Santiago'),
    '1041': dict(nombre='Jorge Mora Fuentes', rut='11.234.567-8', nacimiento='14/04/1988',
                 nacionalidad='Chileno', email='j.mora@techcorp.cl', tel='+56 9 3456 7890',
                 direccion='Av. Central 789, Concepción'),
    '1039': dict(nombre='Sofía Vargas Cárdenas', rut='16.789.012-3', nacimiento='30/09/1995',
                 nacionalidad='Chilena', email='s.vargas@techcorp.cl', tel='+56 9 4567 8901',
                 direccion='Pasaje Sur 321, Santiago'),
}

DATOS_REMUN = {
    '1045': dict(
        note=None, nota_type=None,
        haberes=[('Sueldo base', '$900.000')],
        descuentos=[('AFP (Habitat 11.27%)', '$101.430'), ('Fonasa 7%', '$63.000')],
        liquido='$735.570',
        banco=None,
    ),
    '1044': dict(
        note='🔒 Remuneraciones bloqueadas mientras espera firma del trabajador', nota_type='info',
        haberes=[('Sueldo base', '$1.050.000')],
        descuentos=[('AFP (Provida 11.27%)', '$118.335'), ('Fonasa 7%', '$73.500')],
        liquido='$858.165',
        banco=None,
    ),
    '1043': dict(
        note=None, nota_type=None,
        haberes=[('Sueldo base', '$1.300.000'), ('Bono responsabilidad', '$80.000'), ('Bono movilización', '$30.000')],
        descuentos=[('AFP (Capital 11.27%)', '$146.510'), ('Fonasa 7%', '$98.000')],
        liquido='$1.165.490',
        banco=dict(nombre='Banco Estado', tipo='Cuenta RUT', numero='14562893'),
    ),
    '1041': dict(
        note=None, nota_type=None,
        haberes=[('Sueldo base', '$1.200.000'), ('Bono producción', '$40.000')],
        descuentos=[('AFP (Cuprum 11.27%)', '$139.580'), ('Fonasa 7%', '$87.500')],
        liquido='$1.012.920',
        banco=dict(nombre='Scotiabank', tipo='Cuenta Corriente', numero='09876543'),
    ),
    '1039': dict(
        note='🚫 Contrato anulado. Solo lectura.', nota_type='anulado',
        haberes=[('Sueldo base', '$1.100.000')],
        descuentos=[('AFP (Modelo 11.27%)', '$123.970'), ('Fonasa 7%', '$77.000')],
        liquido='$899.030',
        banco=dict(nombre='BCI', tipo='Cuenta Ahorro', numero='12345678'),
    ),
}

DATOS_DOC = {
    '1045': dict(
        note=None,
        has_pdf=False,
        pdf_name=None,
        can_config=True,
        can_upload=True,
        estado_firma=None,
        mensaje='Sin documento generado. Configure la plantilla y genere el borrador.',
    ),
    '1044': dict(
        note='⌛ Contrato en espera de firma. No regenerar hasta que sea aceptado o rechazado.', nota_type='info',
        has_pdf=True,
        pdf_name='Contrato_1044_borrador.pdf',
        can_config=False,
        can_upload=False,
        estado_firma='Pendiente de firma',
        mensaje=None,
    ),
    '1043': dict(
        note=None,
        has_pdf=True,
        pdf_name='Contrato_1043_firmado.pdf',
        can_config=True,
        can_upload=True,
        estado_firma=None,
        mensaje=None,
    ),
    '1041': dict(
        note='⚠ Contrato terminado. Solo descarga disponible.', nota_type='warn',
        has_pdf=True,
        pdf_name='Contrato_1041_firmado.pdf',
        can_config=False,
        can_upload=False,
        estado_firma=None,
        mensaje=None,
    ),
    '1039': dict(
        note='🚫 Contrato anulado. Solo descarga disponible.', nota_type='anulado',
        has_pdf=True,
        pdf_name='Contrato_1039_firmado.pdf',
        can_config=False,
        can_upload=False,
        estado_firma=None,
        mensaje=None,
    ),
}

DATOS_ANEXOS = {
    '1045': dict(can_add=False, note='Los anexos no están disponibles en estado Borrador.', nota_type='info', anexos=[]),
    '1044': dict(can_add=False, note='Los anexos se habilitan cuando el contrato esté Vigente.', nota_type='info', anexos=[]),
    '1043': dict(can_add=True, note=None, nota_type=None, anexos=[
        dict(tipo='Prórroga', desc='Extensión período prueba', inicio='01/02/2025', termino='01/04/2025', estado='Vigente'),
    ]),
    '1041': dict(can_add=False, note=None, nota_type=None, anexos=[
        dict(tipo='Modificación jornada', desc='Reducción jornada a 30h', inicio='01/06/2024', termino='31/08/2024', estado='Vencido'),
        dict(tipo='Prórroga', desc='Extensión 3 meses', inicio='01/09/2024', termino='28/02/2025', estado='Vencido'),
    ]),
    '1039': dict(can_add=False, note=None, nota_type=None, anexos=[
        dict(tipo='Cambio cargo', desc='Ascenso a Jefa RRHH', inicio='01/09/2024', termino='–', estado='Anulado'),
    ]),
}

DATOS_HIST = {
    '1045': [
        dict(dot='borrador', title='Contrato creado en borrador', meta='01/10/2025 · por admin@techcorp.cl'),
    ],
    '1044': [
        dict(dot='borrador', title='Contrato creado en borrador', meta='15/10/2025 · por admin@techcorp.cl'),
        dict(dot='pendiente', title='Contrato enviado a firma del trabajador', meta='01/11/2025 · por admin@techcorp.cl'),
    ],
    '1043': [
        dict(dot='borrador', title='Contrato creado en borrador', meta='10/01/2025 · por admin@techcorp.cl'),
        dict(dot='pendiente', title='Contrato enviado a firma del trabajador', meta='25/01/2025 · por admin@techcorp.cl'),
        dict(dot='vigente', title='Contrato aceptado y activado', meta='01/02/2025 · firmado por a.torres@techcorp.cl'),
    ],
    '1041': [
        dict(dot='borrador', title='Contrato creado en borrador', meta='15/02/2024 · por admin@techcorp.cl'),
        dict(dot='pendiente', title='Contrato enviado a firma del trabajador', meta='25/02/2024 · por admin@techcorp.cl'),
        dict(dot='vigente', title='Contrato aceptado y activado', meta='01/03/2024 · firmado por j.mora@techcorp.cl'),
        dict(dot='terminado', title='Contrato terminado por vencimiento de plazo', meta='28/02/2025 · por admin@techcorp.cl'),
    ],
    '1039': [
        dict(dot='borrador', title='Contrato creado en borrador', meta='20/05/2024 · por admin@techcorp.cl'),
        dict(dot='pendiente', title='Contrato enviado a firma del trabajador', meta='28/05/2024 · por admin@techcorp.cl'),
        dict(dot='vigente', title='Contrato aceptado y activado', meta='01/06/2024 · firmado por s.vargas@techcorp.cl'),
        dict(dot='anulado', title='Contrato anulado por decisión administrativa', meta='15/03/2025 · por admin@techcorp.cl'),
    ],
}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def note_html(text, tipo):
    if tipo == 'info':
        return f'<div class="info-note" style="margin-bottom:8px">{text}</div>'
    elif tipo == 'warn':
        return f'<div class="warn-note" style="margin-bottom:8px">{text}</div>'
    elif tipo == 'anulado':
        return (f'<div class="warn-note" style="margin-bottom:8px;'
                f'border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.06);color:#fca5a5">{text}</div>')
    return ''


def tabs_html(active_idx):
    parts = []
    for i, t in enumerate(TABS):
        cls = 'mock-tab active' if i == active_idx else 'mock-tab'
        parts.append(f'<div class="{cls}">{t}</div>')
    return ''.join(parts)


def chip_label(e):
    return f'<span class="estado-chip {e["chip"]}" style="font-size:8px;padding:1px 5px;vertical-align:middle">{e["label"]}</span>'


# ─── Tab content renderers ─────────────────────────────────────────────────────
def render_tab1(e):
    d = DATOS_CONTRATO[e['id']]
    t_html = note_html(d['note'], d['nota_type']) if d['note'] else ''
    opacity = ' style="opacity:.7"' if not d['can_edit'] else ''
    termino_color = ' style="color:#475569"' if d['termino'] == '–' else ''
    edit_btn = ('<div style="display:flex;justify-content:flex-end;margin-top:8px">'
                '<div class="m-btn m-btn-ghost" style="font-size:10px">Editar datos</div></div>') if d['can_edit'] else ''
    funciones = '' if not d['can_edit'] else (
        f'<div class="data-field" style="margin-top:6px;margin-bottom:8px">'
        f'<div class="data-key">Funciones principales</div>'
        f'<div class="data-val" style="line-height:1.5">{d["funciones"]}</div></div>'
    )
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'{t_html}'
        f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px"{opacity}>'
        f'<div class="data-field"><div class="data-key">Cargo</div><div class="data-val">{d["cargo"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Tipo</div><div class="data-val">{d["tipo"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Jornada</div><div class="data-val">{d["jornada"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Inicio</div><div class="data-val">{d["inicio"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Término</div>'
        f'<div class="data-val"{termino_color}>{d["termino"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Lugar</div><div class="data-val">{d["lugar"]}</div></div>'
        f'</div>'
        f'{funciones}'
        f'{edit_btn}'
        f'</div>'
    )


def render_tab2(e):
    d = DATOS_TRABAJADOR[e['id']]
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">'
        f'<div class="data-field"><div class="data-key">Nombre completo</div><div class="data-val">{d["nombre"]}</div></div>'
        f'<div class="data-field"><div class="data-key">RUT</div><div class="data-val">{d["rut"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Fecha nacimiento</div><div class="data-val">{d["nacimiento"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Nacionalidad</div><div class="data-val">{d["nacionalidad"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Email</div><div class="data-val">{d["email"]}</div></div>'
        f'<div class="data-field"><div class="data-key">Teléfono</div><div class="data-val">{d["tel"]}</div></div>'
        f'</div>'
        f'<div class="data-field"><div class="data-key">Dirección</div><div class="data-val">{d["direccion"]}</div></div>'
        f'</div>'
    )


def render_tab3(e):
    d = DATOS_REMUN[e['id']]
    t_html = note_html(d['note'], d['nota_type']) if d['note'] else ''
    haberes_html = ''.join(
        f'<div class="remun-row"><span>{h}</span><span>{v}</span></div>'
        for h, v in d['haberes']
    )
    desc_html = ''.join(
        f'<div class="remun-row descuento"><span>{h}</span><span>-{v}</span></div>'
        for h, v in d['descuentos']
    )
    banco_html = ''
    if d['banco']:
        b = d['banco']
        banco_html = (
            f'<div class="mini-card" style="margin-top:8px;background:#0d1b2e">'
            f'<div style="font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:5px">DATOS BANCARIOS</div>'
            f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">'
            f'<div class="data-field"><div class="data-key">Banco</div><div class="data-val">{b["nombre"]}</div></div>'
            f'<div class="data-field"><div class="data-key">Tipo cuenta</div><div class="data-val">{b["tipo"]}</div></div>'
            f'<div class="data-field"><div class="data-key">Número</div><div class="data-val">{b["numero"]}</div></div>'
            f'</div></div>'
        )
    else:
        banco_html = (
            f'<div class="mini-card" style="margin-top:8px;background:#0d1b2e">'
            f'<div style="font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:4px">DATOS BANCARIOS</div>'
            f'<div style="font-size:9px;color:#475569;font-style:italic">No registrados</div>'
            f'</div>'
        )
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'{t_html}'
        f'<div style="font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:4px">HABERES</div>'
        f'{haberes_html}'
        f'<div style="font-size:9px;font-weight:600;color:#94a3b8;margin:6px 0 4px">DESCUENTOS</div>'
        f'{desc_html}'
        f'<div class="remun-row total"><span>Líquido a pagar</span><span>{d["liquido"]}</span></div>'
        f'{banco_html}'
        f'</div>'
    )


def render_tab4(e):
    d = DATOS_DOC[e['id']]
    t_html = note_html(d.get('note'), d.get('nota_type')) if d.get('note') else ''
    if d['has_pdf']:
        pdf_html = (
            f'<div class="pdf-file-card">'
            f'<div class="pdf-icon">📄</div>'
            f'<div class="pdf-info">'
            f'<div class="pdf-name">{d["pdf_name"]}</div>'
            f'<div class="pdf-meta">PDF firmado</div>'
            f'</div>'
            f'<div class="mock-icon-btn" style="font-size:9px">⬇ Descargar</div>'
            f'</div>'
        )
        if d['estado_firma']:
            pdf_html += f'<div class="info-note" style="margin-top:6px">🔏 Estado firma: <b>{d["estado_firma"]}</b></div>'
        if d['can_config']:
            pdf_html += (
                '<div style="margin-top:8px;font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:4px">CONFIGURACIÓN</div>'
                '<div class="plantilla-opt selected">'
                '<div class="plantilla-opt-name">Plantilla: Contrato Plazo Fijo</div>'
                '<div class="plantilla-opt-ico">✓</div>'
                '</div>'
                '<div style="display:flex;gap:4px;margin-top:6px">'
                '<div class="mock-prim-btn" style="font-size:9px;flex:1">↻ Regenerar PDF</div>'
                '</div>'
            )
    else:
        pdf_html = (
            f'<div style="font-size:9px;color:#475569;text-align:center;padding:10px 0">'
            f'📭 {d["mensaje"]}</div>'
            f'<div style="margin-top:6px;font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:4px">PLANTILLA</div>'
            f'<div class="plantilla-opt selected">'
            f'<div class="plantilla-opt-name">Contrato Indefinido</div>'
            f'<div class="plantilla-opt-ico">✓</div>'
            f'</div>'
            f'<div style="display:flex;gap:4px;margin-top:6px">'
            f'<div class="mock-prim-btn" style="font-size:9px;flex:1">⬇ Generar borrador PDF</div>'
            f'</div>'
        )
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'{t_html}{pdf_html}'
        f'</div>'
    )


def render_tab5(e):
    d = DATOS_ANEXOS[e['id']]
    t_html = note_html(d['note'], d['nota_type']) if d['note'] else ''
    header_html = ''
    if d['can_add']:
        header_html = (
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
            '<div style="font-size:9px;font-weight:600;color:#94a3b8">ANEXOS DEL CONTRATO</div>'
            '<div class="mock-prim-btn" style="font-size:9px">+ Agregar anexo</div>'
            '</div>'
        )
    elif d['anexos']:
        header_html = (
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
            '<div style="font-size:9px;font-weight:600;color:#94a3b8">HISTORIAL ANEXOS</div>'
            '<span style="font-size:8px;padding:1px 6px;border-radius:4px;background:#1e293b;color:#64748b">Solo lectura</span>'
            '</div>'
        )
    if d['anexos']:
        anexos_html = ''
        for a in d['anexos']:
            anexos_html += (
                f'<div class="anexo-row">'
                f'<div class="anexo-tipo">{a["tipo"]}</div>'
                f'<div style="font-size:9px;color:var(--txt);margin-bottom:2px">{a["desc"]}</div>'
                f'<div class="anexo-fechas">{a["inicio"]} → {a["termino"]} · <b>{a["estado"]}</b></div>'
                f'</div>'
            )
    else:
        anexos_html = '<div style="font-size:9px;color:#475569;text-align:center;padding:12px 0">Sin anexos</div>'
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'{t_html}{header_html}{anexos_html}'
        f'</div>'
    )


def render_tab6(e):
    events = DATOS_HIST[e['id']]
    items_html = ''
    for i, ev in enumerate(events):
        is_last = (i == len(events) - 1)
        connector = '' if is_last else '<div class="hist-connector"></div>'
        items_html += (
            f'<div class="hist-item">'
            f'<div class="hist-dot-col">'
            f'<div class="hist-dot {ev["dot"]}"></div>'
            f'{connector}'
            f'</div>'
            f'<div class="hist-content">'
            f'<div class="hist-title">{ev["title"]}</div>'
            f'<div class="hist-meta">{ev["meta"]}</div>'
            f'</div>'
            f'</div>'
        )
    return (
        f'<div class="mini-card" style="margin-top:0;border-radius:0 0 7px 7px;border-top:none">'
        f'<div class="hist-timeline">{items_html}</div>'
        f'</div>'
    )


TAB_RENDERERS = [render_tab1, render_tab2, render_tab3, render_tab4, render_tab5, render_tab6]

# ─── Mockup card builder ────────────────────────────────────────────────────────
def build_mockup(e, tab_idx):
    firmas_pill = (
        f'<span class="mock-metapill">Firmas: <b>{e["firmas"]}</b></span>'
        if e['firmas'] else ''
    )
    tab_content = TAB_RENDERERS[tab_idx](e)
    card = (
        f'    <!-- {e["label"]} -->\n'
        f'    <div class="mock-tab-label">Estado: {chip_label(e)}</div>\n'
        f'    <div class="mockup-card">\n'
        f'      <div class="mock-topbar">\n'
        f'        <div class="mock-topbar-bc">Empresa / <b>RRHH · Contratos Laborales</b></div>\n'
        f'        <div class="mock-topbar-icons">🔔 ⚙</div>\n'
        f'      </div>\n'
        f'      <div class="mock-subheader">\n'
        f'        <div class="mock-sh-left">\n'
        f'          <div class="mock-icon-btn">← Volver</div>\n'
        f'          <span class="mock-title">#{e["id"]}</span>\n'
        f'          <span class="estado-chip {e["chip"]}">{e["label"]}</span>\n'
        f'        </div>\n'
        f'        <div class="mock-steppills">{e["stepper_html"]}</div>\n'
        f'      </div>\n'
        f'      <div class="mock-herostrip">\n'
        f'        <div class="mock-herostrip-left">\n'
        f'          <div class="mock-herostrip-bc">Trabajadores / {e["name"]}</div>\n'
        f'          <div class="mock-herostrip-title">\n'
        f'            <span class="mock-herostrip-name">Contrato #{e["id"]}</span>\n'
        f'          </div>\n'
        f'          <div class="mock-metapills">\n'
        f'            <span class="mock-metapill">Tipo: <b>{e["tipo"]}</b></span>\n'
        f'            <span class="mock-metapill">{e["fechas"]}</span>\n'
        f'            {firmas_pill}\n'
        f'          </div>\n'
        f'        </div>\n'
        f'        <div class="mock-herostrip-right" style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end">\n'
        f'          {e["btns_html"]}\n'
        f'        </div>\n'
        f'      </div>\n'
        f'      <div class="mock-body">\n'
        f'        <div class="mock-tabs">{tabs_html(tab_idx)}</div>\n'
        f'        {tab_content}\n'
        f'      </div>\n'
        f'    </div>\n'
    )
    return card


# ─── Main ───────────────────────────────────────────────────────────────────────
def generate_mockups_row():
    parts = ['  <div class="mockups-row">\n\n']
    for tab_idx, tab_name in enumerate(TABS):
        parts.append(f'    <!-- {"="*52} -->\n')
        parts.append(f'    <!-- Tab {tab_idx + 1}: {tab_name.upper()} - 5 estados -->\n')
        parts.append(f'    <!-- {"="*52} -->\n')
        parts.append(f'    <div class="mock-group-header">Tab {tab_idx + 1} · {tab_name}</div>\n\n')
        for e in ESTADOS:
            parts.append(build_mockup(e, tab_idx))
            parts.append('\n')
    parts.append('  </div>\n')
    return ''.join(parts)


def main():
    path = os.path.abspath(TARGET)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    start_marker = '  <div class="mockups-row">'
    end_marker = '  </div>\n</section>'

    start_idx = content.find(start_marker)
    if start_idx < 0:
        print('ERROR: start marker not found')
        sys.exit(1)

    # Find end: the specific </div></section> closing the #layout section
    # After start_marker, find end_marker
    end_idx = content.find(end_marker, start_idx)
    if end_idx < 0:
        print('ERROR: end marker not found')
        sys.exit(1)

    before = content[:start_idx]
    after = content[end_idx + len('  </div>'):]  # keep '\n</section>' and everything after

    new_mockups = generate_mockups_row()
    new_content = before + new_mockups + after

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_content)

    print(f'OK: archivo actualizado con 30 mockups ({len(ESTADOS)} estados x {len(TABS)} tabs)')
    print(f'Ruta: {path}')

    # Verificar encoding
    import re
    test = open(path, encoding='utf-8').read()
    if re.search(r'Ã|â€|Â°|ï¿½', test):
        print('ADVERTENCIA: posible mojibake detectado')
    else:
        print('Encoding OK: sin mojibake')


if __name__ == '__main__':
    main()
