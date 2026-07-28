"""
Seed idempotente: crea una plantilla global v2.9 (documento único Slate)
por cada tipo de contrato del sistema: servicios, venta, licencia,
trabajador y finiquito.

Las plantillas usan exclusivamente claves de etiqueta que resuelven los
adaptadores (`AdaptadorContratoB2B._ALIAS`, `AdaptadorContratoTrabajador._ALIAS`
y rutas `finiquito.*`), condiciones de `_CONDICIONES_TRABAJADOR` y los
subtipos de bloque dinámico soportados por `motor_v29._bloque_dinamico_html`.

Uso:
    python manage.py seed_plantillas_v29_globales
    python manage.py seed_plantillas_v29_globales --reset
    python manage.py seed_plantillas_v29_globales --empresa <id>

Sin `--empresa` las plantillas se crean con empresa_prestadora=None
(globales: visibles en el listado del módulo para todas las prestadoras).
Con `--empresa` se crean ligadas a esa prestadora, lo que las hace
seleccionables también en el wizard de creación de contratos (que filtra
por empresa_prestadora).
"""

from django.core.management.base import BaseCommand, CommandError

from contratos.models import PlantillaContrato


# ─── Builders de nodos Slate (mismo shape que plantillaContratoV2.interface.ts) ──

def t(texto, **marks):
    nodo = {"text": texto}
    nodo.update(marks)
    return nodo


def et(clave):
    return {"type": "etiqueta", "clave": clave, "children": [{"text": ""}], "void": True, "inline": True}


def p(*children, align=None):
    nodo = {"type": "parrafo", "children": list(children)}
    if align:
        nodo["align"] = align
    return nodo


def h(level, texto, align=None):
    nodo = {"type": "heading", "level": level, "children": [t(texto)]}
    if align:
        nodo["align"] = align
    return nodo


def listado(items, formato="desordenado"):
    return {
        "type": "listado",
        "formato": formato,
        "children": [{"type": "item-listado", "children": list(item)} for item in items],
    }


def cond(condition, *children, label=None):
    nodo = {"type": "condicional", "condition": condition, "children": list(children)}
    if label:
        nodo["label"] = label
    return nodo


def dinamico(subtipo):
    return {"type": "bloque_dinamico", "subtipo": subtipo, "children": [{"text": ""}], "void": True}


def firma(*roles):
    return {
        "type": "firma",
        "firmantes": [{"rol": rol} for rol in roles],
        "children": [{"text": ""}],
        "void": True,
    }


def salto_pagina():
    return {"type": "salto_pagina", "children": [{"text": ""}], "void": True}


def config_pagina(pie_texto):
    return {
        "tamano": "carta",
        "fuente": "Arial, sans-serif",
        "encabezado": {
            "activo": True,
            "contenido": [p(t(""))],
            "logo_auto": True,
            "logo_lado": "izquierda",
        },
        "pie": {
            "activo": True,
            "contenido": [p(t(pie_texto), align="center")],
            "numeracion": True,
        },
    }


# ─── Plantilla: Servicios ────────────────────────────────────────────────────

DOC_SERVICIOS = [
    h(1, "CONTRATO DE PRESTACIÓN DE SERVICIOS", align="center"),
    p(
        t("En "), et("lugar_firma"), t(", a "), et("fecha_firma"), t(", entre "),
        t("", bold=True), et("nombre_proveedor"), t(", RUT "), et("rut_proveedor"),
        t(", domiciliada en "), et("domicilio_proveedor"),
        t(", representada legalmente por don/doña "), et("representante_proveedor"),
        t(", RUT "), et("rut_representante_proveedor"),
        t(", en adelante el «Proveedor»; y "), et("nombre_cliente"),
        t(", RUT "), et("rut_cliente"), t(", domiciliada en "), et("domicilio_cliente"),
        t(", representada legalmente por don/doña "), et("representante_cliente"),
        t(", RUT "), et("rut_representante_cliente"),
        t(", en adelante el «Cliente», se ha convenido el siguiente contrato de prestación de servicios:"),
        align="justify",
    ),
    h(2, "Primero: Objeto del contrato"),
    p(
        t("El Proveedor se obliga a prestar al Cliente el servicio denominado "),
        et("nombre_plan"), t(", consistente en: "), et("descripcion_servicio"),
        t(". El detalle de los servicios contratados es el siguiente:"),
        align="justify",
    ),
    dinamico("servicios"),
    h(2, "Segundo: Alcance del servicio"),
    p(t("El servicio contratado incluye: "), et("incluye_servicio"), align="justify"),
    p(t("Quedan expresamente excluidos del servicio: "), et("no_incluye_servicio"), align="justify"),
    p(
        t("El Proveedor realizará hasta "), et("visitas_mensuales"),
        t(" visitas mensuales en las dependencias del Cliente, sin perjuicio de la atención remota que corresponda."),
        align="justify",
    ),
    h(2, "Tercero: Vigencia"),
    p(
        t("El presente contrato regirá desde el "), et("fecha_inicio_contrato"),
        t(" y tendrá una duración de "), et("vigencia_meses"),
        t(" meses, hasta el "), et("fecha_fin_contrato"),
        t(", renovándose por períodos iguales y sucesivos salvo aviso escrito de cualquiera de las partes con a lo menos 30 días de anticipación al vencimiento."),
        align="justify",
    ),
    h(2, "Cuarto: Precio y forma de pago"),
    p(
        t("El Cliente pagará al Proveedor un total de "), et("valor_total"),
        t(" "), et("moneda_contrato"),
        t(", con modalidad de pago "), et("forma_pago"),
        t(". La facturación se emitirá el día "), et("dia_facturacion"),
        t(" de cada período, y su pago deberá efectuarse dentro de los 30 días corridos siguientes a la recepción conforme de la factura."),
        align="justify",
    ),
    h(2, "Quinto: Condiciones especiales"),
    dinamico("condiciones_especiales"),
    p(t("Adicionalmente, aplican las siguientes cláusulas particulares del servicio: "), et("clausulas_especiales_servicio"), align="justify"),
    h(2, "Sexto: Confidencialidad"),
    p(
        t("Las partes se obligan a mantener estricta reserva y confidencialidad respecto de toda la información técnica, comercial o de negocio a la que accedan con ocasión de este contrato, obligación que subsistirá por 2 años contados desde su término."),
        align="justify",
    ),
    h(2, "Séptimo: Término anticipado"),
    p(
        t("El incumplimiento grave de las obligaciones de cualquiera de las partes facultará a la otra para poner término anticipado al contrato, mediante comunicación escrita, sin perjuicio de las acciones legales que correspondan."),
        align="justify",
    ),
    h(2, "Octavo: Domicilio y competencia"),
    p(
        t("Para todos los efectos legales derivados del presente contrato, las partes fijan su domicilio en la ciudad de "),
        et("lugar_firma"),
        t(" y se someten a la competencia de sus Tribunales Ordinarios de Justicia."),
        align="justify",
    ),
    p(t("El presente contrato se firma en dos ejemplares de igual tenor y fecha, quedando uno en poder de cada parte."), align="justify"),
    firma("Proveedor", "Cliente"),
]


# ─── Plantilla: Venta ────────────────────────────────────────────────────────

DOC_VENTA = [
    h(1, "CONTRATO DE COMPRAVENTA DE EQUIPAMIENTO Y SERVICIOS", align="center"),
    p(
        t("En "), et("lugar_firma"), t(", a "), et("fecha_firma"), t(", entre "),
        et("nombre_proveedor"), t(", RUT "), et("rut_proveedor"),
        t(", domiciliada en "), et("domicilio_proveedor"),
        t(", representada legalmente por don/doña "), et("representante_proveedor"),
        t(", RUT "), et("rut_representante_proveedor"),
        t(", en adelante el «Vendedor»; y "), et("nombre_cliente"),
        t(", RUT "), et("rut_cliente"), t(", domiciliada en "), et("domicilio_cliente"),
        t(", representada legalmente por don/doña "), et("representante_cliente"),
        t(", RUT "), et("rut_representante_cliente"),
        t(", en adelante el «Comprador», se ha convenido el siguiente contrato de compraventa:"),
        align="justify",
    ),
    h(2, "Primero: Objeto"),
    p(
        t("El Vendedor vende y transfiere al Comprador, quien compra y acepta para sí, los bienes y servicios detallados en las cotizaciones aceptadas que forman parte integrante de este contrato ("),
        et("cantidad_cotizaciones"),
        t(" cotización(es) vinculada(s)):"),
        align="justify",
    ),
    dinamico("cotizacion_venta"),
    h(2, "Segundo: Precio"),
    p(
        t("El precio total de la compraventa asciende a "), et("total_cotizaciones"),
        t(", según el siguiente detalle de totales por moneda y su conversión:"),
        align="justify",
    ),
    p(et("cotizaciones_totales_convertidos"), align="justify"),
    p(
        t("Para las conversiones se utilizó el valor del dólar observado informado a la fecha de cada cotización: "),
        et("dolar_observado_cotizaciones"),
        align="justify",
    ),
    dinamico("resumen_comercial"),
    h(2, "Tercero: Forma de pago"),
    p(
        t("El Comprador pagará el precio en modalidad "), et("forma_pago_venta"),
        t(", en "), et("cantidad_cuotas_venta"),
        t(" cuota(s), conforme al siguiente calendario de pagos asociado a hitos:"),
        align="justify",
    ),
    p(et("cuotas_venta_tabla"), align="justify"),
    h(2, "Cuarto: Entrega y recepción"),
    p(
        t("La entrega de los bienes se efectuará en el domicilio del Comprador o en el lugar que las partes acuerden por escrito. La recepción conforme se acreditará mediante acta o guía de despacho firmada por el Comprador, momento desde el cual se transfiere el riesgo de los bienes."),
        align="justify",
    ),
    h(2, "Quinto: Garantía"),
    p(
        t("Los bienes vendidos cuentan con la garantía legal y con la garantía del fabricante cuando corresponda. La garantía no cubre daños derivados de mal uso, intervención de terceros no autorizados, o fuerza mayor."),
        align="justify",
    ),
    h(2, "Sexto: Vigencia y renovación"),
    p(
        t("El presente contrato rige desde el "), et("fecha_inicio_contrato"),
        t(". Renovación automática: "), et("renovacion_automatica"),
        t(". Cualquiera de las partes podrá comunicar su intención de término con al menos "),
        et("dias_aviso_termino"), t(" días de anticipación."),
        align="justify",
    ),
    h(2, "Séptimo: Domicilio y competencia"),
    p(
        t("Para todos los efectos legales, las partes fijan domicilio en la ciudad de "),
        et("lugar_firma"),
        t(" y se someten a la competencia de sus Tribunales Ordinarios de Justicia."),
        align="justify",
    ),
    firma("Vendedor", "Comprador"),
]


# ─── Plantilla: Licencia ─────────────────────────────────────────────────────

DOC_LICENCIA = [
    h(1, "CONTRATO DE LICENCIAMIENTO DE SOFTWARE", align="center"),
    p(
        t("En "), et("lugar_firma"), t(", a "), et("fecha_firma"), t(", entre "),
        et("nombre_proveedor"), t(", RUT "), et("rut_proveedor"),
        t(", domiciliada en "), et("domicilio_proveedor"),
        t(", representada legalmente por don/doña "), et("representante_proveedor"),
        t(", RUT "), et("rut_representante_proveedor"),
        t(", en adelante el «Licenciante»; y "), et("nombre_cliente"),
        t(", RUT "), et("rut_cliente"), t(", domiciliada en "), et("domicilio_cliente"),
        t(", representada legalmente por don/doña "), et("representante_cliente"),
        t(", RUT "), et("rut_representante_cliente"),
        t(", en adelante el «Licenciatario», se ha convenido el siguiente contrato de licenciamiento:"),
        align="justify",
    ),
    h(2, "Primero: Objeto"),
    p(
        t("El Licenciante otorga al Licenciatario una licencia de uso, no exclusiva e intransferible, sobre el software "),
        et("nombre_licencia"), t(" del proveedor "), et("proveedor_licencia"),
        t(", en modalidad "), et("modalidad_licencia"),
        t(", por un total de "), et("cantidad_licencias"),
        t(" licencia(s). El detalle de las licencias contratadas es el siguiente:"),
        align="justify",
    ),
    dinamico("licencias"),
    h(2, "Segundo: Usuarios autorizados"),
    p(
        t("Las licencias quedarán asignadas a los usuarios individualizados a continuación. El Licenciatario deberá informar por escrito cualquier reasignación:"),
        align="justify",
    ),
    p(et("licenciatarios_tabla"), align="justify"),
    h(2, "Tercero: Vigencia"),
    p(
        t("Las licencias tendrán vigencia desde el "), et("vigencia_licencia_inicio"),
        t(" hasta el "), et("vigencia_licencia_fin"),
        t(", renovándose según la modalidad contratada salvo aviso escrito en contrario con 30 días de anticipación al vencimiento."),
        align="justify",
    ),
    h(2, "Cuarto: Precio y facturación"),
    p(
        t("El Licenciatario pagará por las licencias un precio unitario de "),
        et("precio_unitario_licencia"), t(", totalizando "), et("valor_total_licencia"),
        t(" "), et("moneda_contrato"),
        t(", con modalidad de pago "), et("forma_pago"),
        t(". La facturación se emitirá el día "), et("dia_facturacion"),
        t(" de cada período."),
        align="justify",
    ),
    h(2, "Quinto: Restricciones de uso"),
    listado([
        [t("Queda prohibida la cesión, sublicencia, arriendo o préstamo de las licencias a terceros.")],
        [t("Queda prohibida la ingeniería inversa, descompilación o desensamblado del software.")],
        [t("El uso queda limitado a la cantidad de usuarios y puestos efectivamente licenciados.")],
        [t("El Licenciatario es responsable de la custodia de las credenciales de acceso asignadas.")],
    ]),
    h(2, "Sexto: Propiedad intelectual"),
    p(
        t("El software licenciado y su documentación son y seguirán siendo de propiedad exclusiva del titular de sus derechos. Este contrato no transfiere propiedad alguna sobre el software, sino únicamente el derecho de uso en los términos pactados."),
        align="justify",
    ),
    h(2, "Séptimo: Domicilio y competencia"),
    p(
        t("Para todos los efectos legales, las partes fijan domicilio en la ciudad de "),
        et("lugar_firma"),
        t(" y se someten a la competencia de sus Tribunales Ordinarios de Justicia."),
        align="justify",
    ),
    firma("Licenciante", "Licenciatario"),
]


# ─── Plantilla: Trabajador (contrato laboral chileno) ────────────────────────

DOC_TRABAJADOR = [
    h(1, "CONTRATO INDIVIDUAL DE TRABAJO", align="center"),
    p(
        t("En "), et("lugar_firma"), t(", a "), et("fecha_firma"), t(", entre "),
        et("nombre_empresa"), t(", RUT "), et("rut_empresa"),
        t(", domiciliada en "), et("domicilio_empresa"),
        t(", representada legalmente por don/doña "), et("representante_legal"),
        t(", RUT "), et("rut_representante"),
        t(", en adelante el «Empleador»; y don/doña "), et("nombre_trabajador"),
        t(", RUT "), et("rut_trabajador"), t(", de nacionalidad "), et("nacionalidad"),
        t(", estado civil "), et("estado_civil"),
        t(", de profesión u oficio "), et("profesion_u_oficio"),
        t(", domiciliado/a en "), et("direccion_trabajador"),
        t(", en adelante el «Trabajador», se ha convenido el siguiente Contrato Individual de Trabajo:"),
        align="justify",
    ),
    h(2, "Primero: Naturaleza y vigencia"),
    p(et("vigencia_descripcion"), align="justify"),
    cond(
        "solo_reemplazo",
        p(
            t("El presente contrato se celebra para reemplazar a don/doña "),
            et("contrato.nombre_reemplazado"), t(", RUT "), et("contrato.rut_reemplazado"),
            t(", quien se encuentra en situación de "), et("contrato.causal_reemplazo_label"),
            t(". El contrato terminará al momento de la reincorporación del trabajador reemplazado."),
            align="justify",
        ),
        label="Solo contratos de reemplazo",
    ),
    h(2, "Segundo: Cargo y funciones"),
    p(
        t("El Trabajador se desempeñará en el cargo de "), et("nombre_cargo"),
        t(". Sus principales funciones serán: "), et("funciones_cargo"),
        t(", sin perjuicio de otras labores inherentes al cargo que el Empleador le encomiende."),
        align="justify",
    ),
    h(2, "Tercero: Jornada de trabajo"),
    p(et("jornada_descripcion"), align="justify"),
    cond(
        "si_grupo_turno",
        p(
            t("El Trabajador cumplirá su jornada en sistema de turnos rotativos, conforme al siguiente esquema:"),
            align="justify",
        ),
        p(et("jornada.tabla_slots")),
        label="Solo jornada por turnos",
    ),
    h(2, "Cuarto: Remuneración"),
    p(
        t("El Empleador pagará al Trabajador una remuneración mensual de $"),
        et("sueldo_base"), t(" ("), et("sueldo_base_palabras"),
        t("), pagadera por períodos mensuales vencidos, dentro de los últimos 5 días hábiles de cada mes."),
        align="justify",
    ),
    cond(
        "si_gratificacion",
        p(et("gratificacion_legal"), align="justify"),
        label="Solo si aplica gratificación",
    ),
    cond(
        "si_bono_movilizacion",
        p(
            t("Adicionalmente, el Empleador pagará al Trabajador un bono de movilización mensual de $"),
            et("bono_movilizacion"),
            t(", el que no constituirá remuneración para ningún efecto legal."),
            align="justify",
        ),
        label="Solo con bono de movilización",
    ),
    cond(
        "si_bono_colacion",
        p(
            t("El Empleador otorgará al Trabajador un bono de colación mensual de $"),
            et("bono_colacion"),
            t(", el que no constituirá remuneración para ningún efecto legal."),
            align="justify",
        ),
        label="Solo con bono de colación",
    ),
    h(2, "Quinto: Previsión y salud"),
    p(
        t("El Trabajador declara encontrarse afiliado a la AFP "), et("nombre_afp"),
        t(" y a "), et("sistema_salud_label"),
        t(", autorizando al Empleador para efectuar los descuentos previsionales y de salud que procedan conforme a la ley."),
        align="justify",
    ),
    cond(
        "si_banco",
        p(
            t("Las remuneraciones se pagarán mediante transferencia electrónica a la "),
            et("tipo_cuenta_bancaria"), t(" N° "), et("numero_cuenta_bancaria"),
            t(" del banco "), et("nombre_banco"), t(", de titularidad del Trabajador."),
            align="justify",
        ),
        label="Solo con cuenta bancaria registrada",
    ),
    h(2, "Sexto: Obligaciones del trabajador"),
    listado([
        [t("Cumplir íntegramente la jornada de trabajo pactada y las instrucciones de sus superiores.")],
        [t("Guardar reserva de la información del Empleador y de sus clientes a la que acceda por su cargo.")],
        [t("Cuidar los equipos, herramientas y materiales que se le entreguen para el desempeño de sus funciones.")],
        [t("Observar los reglamentos internos de orden, higiene y seguridad de la empresa.")],
    ]),
    cond(
        "solo_plazo_fijo",
        h(2, "Séptimo: Término del contrato"),
        p(
            t("El presente contrato terminará el "), et("fecha_termino"),
            t(", por la causal del artículo 159 N°4 del Código del Trabajo (vencimiento del plazo convenido), salvo que las partes acuerden su renovación por escrito."),
            align="justify",
        ),
        label="Solo plazo fijo",
    ),
    h(2, "Final: Ejemplares"),
    p(
        t("El presente contrato se firma en dos ejemplares de igual tenor y fecha, declarando el Trabajador haber recibido un ejemplar en este acto."),
        align="justify",
    ),
    firma("Empleador", "Trabajador"),
]


# ─── Plantilla: Finiquito ────────────────────────────────────────────────────

DOC_FINIQUITO = [
    h(1, "FINIQUITO DE CONTRATO DE TRABAJO", align="center"),
    p(
        t("En "), et("lugar_firma"), t(", a "), et("finiquito.fecha_firma"), t(", entre "),
        et("nombre_empresa"), t(", RUT "), et("rut_empresa"),
        t(", representada legalmente por don/doña "), et("representante_legal"),
        t(", RUT "), et("rut_representante"),
        t(", en adelante el «Empleador»; y don/doña "), et("nombre_trabajador"),
        t(", RUT "), et("rut_trabajador"),
        t(", en adelante el «Trabajador», se deja constancia y se acuerda lo siguiente:"),
        align="justify",
    ),
    h(2, "Primero: Relación laboral"),
    p(
        t("El Trabajador prestó servicios al Empleador desde el "), et("fecha_inicio"),
        t(", desempeñándose en el cargo de "), et("nombre_cargo"),
        t(", hasta el "), et("finiquito.fecha_termino"),
        t(", fecha en que la relación laboral terminó por la causal: "),
        et("finiquito.motivo_termino"), t("."),
        align="justify",
    ),
    h(2, "Segundo: Montos del finiquito"),
    p(
        t("Con motivo del término de la relación laboral, el Empleador paga al Trabajador los siguientes montos:"),
        align="justify",
    ),
    listado([
        [t("Total haberes (bruto): $"), et("finiquito.total_bruto")],
        [t("Total descuentos: $"), et("finiquito.total_descuentos")],
        [t("Total líquido a pagar: $", bold=True), et("finiquito.total_neto")],
    ]),
    h(2, "Tercero: Declaración del trabajador"),
    p(
        t("El Trabajador declara recibir en este acto, a su entera satisfacción, la suma líquida indicada precedentemente, y deja constancia de que durante la vigencia de la relación laboral recibió oportunamente el pago de sus remuneraciones, cotizaciones previsionales, feriados y demás prestaciones legales y contractuales."),
        align="justify",
    ),
    h(2, "Cuarto: Renuncia de acciones"),
    p(
        t("En consecuencia, el Trabajador otorga al Empleador el más amplio, completo y total finiquito, renunciando a toda acción o reclamación derivada de la relación laboral o de su término, sin reserva alguna, salvo las que expresamente se indiquen en este instrumento."),
        align="justify",
    ),
    h(2, "Quinto: Ratificación"),
    p(
        t("El presente finiquito se otorga y firma ante ministro de fe, conforme al artículo 177 del Código del Trabajo, leyéndolo y ratificándolo las partes en señal de conformidad."),
        align="justify",
    ),
    firma("Empleador", "Trabajador"),
]


PLANTILLAS = [
    {
        "titulo": "Contrato de Servicios — Plantilla Global v2.9",
        "tipo_contrato": "servicios",
        "descripcion": (
            "Plantilla global v2.9 para contratos de prestación de servicios TI. "
            "Incluye comparecencia, tabla dinámica de servicios, alcance, vigencia, "
            "precio, condiciones especiales, confidencialidad y firmas."
        ),
        "documento": DOC_SERVICIOS,
        "pie": "Contrato de Prestación de Servicios",
    },
    {
        "titulo": "Contrato de Venta — Plantilla Global v2.9",
        "tipo_contrato": "venta",
        "descripcion": (
            "Plantilla global v2.9 para contratos de compraventa. Incluye ítems de "
            "cotizaciones aceptadas, totales convertidos multi-moneda, calendario "
            "de cuotas por hitos, entrega, garantía y firmas."
        ),
        "documento": DOC_VENTA,
        "pie": "Contrato de Compraventa",
    },
    {
        "titulo": "Contrato de Licenciamiento — Plantilla Global v2.9",
        "tipo_contrato": "licencia",
        "descripcion": (
            "Plantilla global v2.9 para contratos de licenciamiento de software. "
            "Incluye detalle de licencias, tabla de licenciatarios, vigencia, "
            "precio, restricciones de uso y propiedad intelectual."
        ),
        "documento": DOC_LICENCIA,
        "pie": "Contrato de Licenciamiento",
    },
    {
        "titulo": "Contrato de Trabajo — Plantilla Global v2.9",
        "tipo_contrato": "trabajador",
        "descripcion": (
            "Plantilla global v2.9 para contratos laborales chilenos (Código del "
            "Trabajo). Cláusulas condicionales según tipo de contrato, bonos, "
            "gratificación, turnos y cuenta bancaria."
        ),
        "documento": DOC_TRABAJADOR,
        "pie": "Contrato Individual de Trabajo",
    },
    {
        "titulo": "Finiquito de Contrato — Plantilla Global v2.9",
        "tipo_contrato": "finiquito",
        "descripcion": (
            "Plantilla global v2.9 para finiquitos laborales (Art. 177 Código del "
            "Trabajo). Incluye montos del finiquito, declaración, renuncia de "
            "acciones y ratificación."
        ),
        "documento": DOC_FINIQUITO,
        "pie": "Finiquito de Contrato de Trabajo",
    },
]


class Command(BaseCommand):
    help = "Crea una plantilla global v2.9 por cada tipo de contrato (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina las plantillas de este seed y las recrea desde cero.",
        )
        parser.add_argument(
            "--empresa",
            type=int,
            default=None,
            help=(
                "ID de la empresa prestadora. Si se indica, las plantillas se crean "
                "ligadas a esa empresa (visibles también en el wizard de contratos). "
                "Sin este argumento se crean como globales (empresa_prestadora=None)."
            ),
        )

    def handle(self, *args, **options):
        empresa = None
        if options["empresa"] is not None:
            from empresas.models import Empresa
            try:
                empresa = Empresa.objects.get(pk=options["empresa"])
            except Empresa.DoesNotExist:
                raise CommandError(f"No existe Empresa con id={options['empresa']}.")

        titulos = [pl["titulo"] for pl in PLANTILLAS]
        if options["reset"]:
            deleted, _ = PlantillaContrato.objects.filter(
                titulo__in=titulos, empresa_prestadora=empresa
            ).delete()
            self.stdout.write(self.style.WARNING(f"Plantillas anteriores eliminadas (deleted={deleted})."))

        for datos in PLANTILLAS:
            plantilla, created = PlantillaContrato.objects.get_or_create(
                titulo=datos["titulo"],
                empresa_prestadora=empresa,
                defaults={
                    "tipo_contrato": datos["tipo_contrato"],
                    "descripcion": datos["descripcion"],
                    "es_default": empresa is None,
                    "activa": True,
                    "version": 1,
                    "version_editor": "v29",
                    "contenido_documento_v29": datos["documento"],
                    "config_pagina_v29": config_pagina(datos["pie"]),
                },
            )
            accion = self.style.SUCCESS("Creada") if created else "Ya existía"
            self.stdout.write(
                f"{accion}: [{datos['tipo_contrato']}] '{plantilla.titulo}' (id={plantilla.id})"
            )

        destino = f"empresa id={empresa.id}" if empresa else "globales (empresa_prestadora=None)"
        self.stdout.write(self.style.SUCCESS(
            f"Seed completo: {len(PLANTILLAS)} plantillas v2.9 — {destino}."
        ))
