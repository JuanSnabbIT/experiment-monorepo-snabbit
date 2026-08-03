"""
Adaptadores polimorficos para el motor de plantillas v2.

Permiten que un mismo motor de generacion de PDF y de secciones renderizadas
opere sobre dos modelos heterogeneos:

- ``contratos.ContratoEmpresaCliente`` (contratos B2B servicios/venta/licencia)
- ``rrhh.ContratoTrabajador`` (contratos laborales)

Cada adaptador concreto encapsula como obtener la empresa prestadora,
la contraparte, las secciones generadas y como resolver rutas de etiquetas
extendidas para su tipo de contrato. El motor v2 trabaja exclusivamente
contra la interfaz ``IContratoBase`` y delega la resolucion concreta al
adaptador, manteniendo el motor v1 intacto (no se modifica).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Optional

from django.db.models import QuerySet
from django.utils.html import escape

_logger = logging.getLogger(__name__)


# Sentinel para distinguir "ruta no manejada por el adaptador" de
# "ruta manejada y resuelta a string vacio".
NOT_HANDLED = object()


class IContratoBase(ABC):
    """Interfaz que todo adaptador debe implementar para el motor v2."""

    # ----- Identidad y metadata -----
    @property
    @abstractmethod
    def instancia(self) -> Any:
        """Modelo subyacente (ContratoEmpresaCliente o ContratoTrabajador)."""

    @property
    @abstractmethod
    def tipo(self) -> str:
        """Tipo logico del contrato: 'servicios'|'venta'|'licencia'|'trabajador'."""

    @property
    @abstractmethod
    def nombre(self) -> str:
        """Titulo visible del contrato."""

    @property
    @abstractmethod
    def estado(self) -> str:
        """Estado actual (para watermark BORRADOR)."""

    # ----- Partes del contrato -----
    @property
    @abstractmethod
    def empresa_prestadora(self):
        """Empresa que provee el servicio/contrata al trabajador."""

    @property
    @abstractmethod
    def plantilla(self):
        """``PlantillaContrato`` asociada o None."""

    # ----- Secciones generadas (acceso polimorfico al ORM) -----
    @abstractmethod
    def secciones_generadas_qs(self) -> QuerySet:
        """QuerySet de SeccionContratoGenerada filtrado por la instancia."""

    @abstractmethod
    def crear_seccion_generada(self, *, seccion_plantilla, titulo: str,
                               contenido_renderizado: str, orden: int):
        """Crea una nueva ``SeccionContratoGenerada`` ligada a la instancia."""

    @abstractmethod
    def set_plantilla_version_usada(self, version_str: str) -> None:
        """Guarda el numero de version de la plantilla usada (si aplica)."""

    # ----- Resolucion de rutas extendidas para el motor v2 -----
    @abstractmethod
    def resolver_ruta_extendida(self, ruta: str, default: Optional[str] = None):
        """
        Intenta resolver ``ruta`` a un valor string. Debe retornar:

        * ``str`` si el adaptador maneja la ruta y la resolvio.
        * ``NOT_HANDLED`` si el adaptador no conoce la ruta (el motor v2
          aplicara fallbacks).
        """

    # ----- Catálogo de etiquetas para el editor v2.9 -----
    @classmethod
    def catalogo_etiquetas(cls, tipo_contrato: str = "") -> list[dict]:
        """
        Retorna las etiquetas disponibles para el editor v2.9.
        Shape compatible con IEtiquetaPlantilla del frontend.
        Default vacío; los adaptadores concretos lo sobreescriven.
        """
        return []

    # ----- Campos obligatorios (validacion de completitud pre-export) -----
    def es_campo_obligatorio(self, clave: str) -> bool:
        """
        Indica si ``clave`` es un dato que un contrato valido nunca deberia
        exportar en blanco (identidad de las partes, cargo, etc.), a
        diferencia de campos legitimamente vacios por diseno (bonos no
        activos, seccion de reemplazo cuando no aplica, etc.).

        Default False; los adaptadores concretos declaran su propio set.
        """
        return False

    # ----- Datos del firmante (nombre/RUT bajo la linea de firma) -----
    def datos_firmante(self, rol: str) -> tuple[str, str] | None:
        """
        Retorna ``(nombre, rut)`` de quien firma en representacion de ``rol``
        (ej. "Empleador", "Trabajador", "Proveedor", "Cliente"), o ``None``
        si el rol no es reconocido por este adaptador.

        Default None; los adaptadores concretos declaran su propio mapeo.
        """
        return None


# ---------------------------------------------------------------------------
# Adaptador B2B
# ---------------------------------------------------------------------------

class AdaptadorContratoB2B(IContratoBase):
    """
    Adaptador para ``ContratoEmpresaCliente``.

    Resuelve claves cortas expandiendo ``_ALIAS`` y delegando en
    ``motor_plantillas._resolver_ruta`` (usado por el editor v2.9, que no
    aporta un ``etiquetas_map`` real). Las rutas ya expandidas (con punto),
    que vienen de una ``EtiquetaPlantilla`` real en BD del editor v2 legacy,
    retornan ``NOT_HANDLED`` para que el motor v2 caiga al mismo
    ``_resolver_ruta`` via el fallback de ``motor_plantillas_v2``.
    """

    def __init__(self, contrato_empresa_cliente):
        self._c = contrato_empresa_cliente

    @property
    def instancia(self):
        return self._c

    @property
    def tipo(self) -> str:
        return self._c.tipo

    @property
    def nombre(self) -> str:
        return self._c.nombre or "Contrato"

    @property
    def estado(self) -> str:
        return getattr(self._c, "estado", "") or ""

    @property
    def empresa_prestadora(self):
        return self._c.empresa_prestadora

    @property
    def plantilla(self):
        return self._c.plantilla

    def secciones_generadas_qs(self) -> QuerySet:
        from contratos.models import SeccionContratoGenerada
        return SeccionContratoGenerada.objects.filter(contrato=self._c)

    def crear_seccion_generada(self, *, seccion_plantilla, titulo, contenido_renderizado, orden):
        from contratos.models import SeccionContratoGenerada
        return SeccionContratoGenerada.objects.create(
            contrato=self._c,
            seccion_plantilla=seccion_plantilla,
            titulo=titulo,
            contenido_renderizado=contenido_renderizado,
            orden=orden,
        )

    def set_plantilla_version_usada(self, version_str: str) -> None:
        self._c.plantilla_version_usada = version_str
        self._c.save(update_fields=["plantilla_version_usada", "fecha_modificacion"])

    def _format_date(self, value) -> str:
        if not value:
            return ""
        try:
            return value.strftime("%d/%m/%Y")
        except AttributeError:
            return str(value)

    def resolver_ruta_extendida(self, ruta, default=None):
        if not ruta or not isinstance(ruta, str):
            return NOT_HANDLED

        if "." not in ruta:
            # Clave sin origen_dato navegable (ver _CLAVES_SIN_RUTA): se
            # resuelve con un metodo propio, no via _ALIAS.
            if ruta == "licenciatarios_tabla":
                return self._renderizar_licenciatarios_tabla() or (default or "")

            # Clave corta del editor v2.9 (motor_v29 siempre llama con
            # etiquetas_map={}, por lo que nunca hay una EtiquetaPlantilla real
            # que aporte un origen_dato con punto). Expandir via _ALIAS y
            # resolver aqui mismo — antes este metodo ignoraba _ALIAS por
            # completo y toda clave corta B2B en v2.9 quedaba sin resolver.
            ruta_expandida = self._ALIAS.get(ruta)
            if ruta_expandida is None:
                return NOT_HANDLED
            if ruta_expandida.startswith("licencia_principal."):
                return self._resolver_licencia_principal(ruta_expandida, default)
            from contratos.motor_plantillas import _resolver_ruta
            return _resolver_ruta(self._c, ruta_expandida, default)

        # Ruta ya expandida (con punto): viene de una EtiquetaPlantilla real en
        # BD, camino del editor v2 legacy. Sin cambios — sigue el fallback a
        # motor v1 via motor_plantillas_v2._resolver_ruta_v2.
        return NOT_HANDLED

    def _resolver_licencia_principal(self, ruta: str, default=None) -> str:
        """Resuelve ``licencia_principal.<campo>`` sobre la primera linea de
        ContratoLicencia del contrato. ContratoLicencia es 1-a-muchos por
        contrato, igual que ContratoItemComercial; se referencia solo la
        primera linea (limitacion conocida, igual que ``items_comerciales[0]``
        para servicios/venta)."""
        campo = ruta.split(".", 1)[1]
        linea = self._c.contrato_licencias.first()
        if not linea:
            return default or ""
        if campo == "nombre":
            return linea.nombre_snapshot or (default or "")
        if campo == "proveedor":
            return linea.proveedor_snapshot or (default or "")
        if campo == "modalidad":
            return linea.get_modalidad_snapshot_display() or (default or "")
        if campo == "cantidad":
            return str(linea.cantidad) if linea.cantidad else (default or "")
        if campo == "precio_unitario":
            valor = linea.precio_unitario_snapshot
            return str(valor) if valor is not None else (default or "")
        if campo == "fecha_inicio":
            return self._format_date(linea.fecha_inicio)
        if campo == "fecha_fin":
            return self._format_date(linea.fecha_fin)
        return default or ""

    def _renderizar_licenciatarios_tabla(self) -> str:
        """Tabla HTML con los licenciatarios de todas las lineas de licencia
        del contrato — a diferencia de las variables ``licencia_principal.*``,
        esta tabla no se limita a la primera linea."""
        filas = []
        for linea in self._c.contrato_licencias.all():
            for vinculo in linea.vinculos_licencia.all():
                filas.append(
                    f"<tr><td>{escape(linea.nombre_snapshot or '')}</td>"
                    f"<td>{escape(vinculo.nombre_asignado or '')}</td>"
                    f"<td>{escape(vinculo.correo_asignado or '')}</td></tr>"
                )
        if not filas:
            return ""
        return (
            "<table><thead><tr>"
            "<th>Licencia</th><th>Licenciatario</th><th>Correo</th>"
            "</tr></thead><tbody>" + "".join(filas) + "</tbody></table>"
        )

    # Alias de claves cortas → rutas navegables por el motor v1
    # (``motor_plantillas._resolver_ruta``). Fuente de verdad única para el
    # catálogo de etiquetas del editor v2.9 — ampliar aquí cuando se agreguen.
    _ALIAS: dict[str, str] = {
        # cliente
        "nombre_cliente":              "empresa_cliente.nombre",
        "rut_cliente":                 "empresa_cliente.rut_empresa",
        "domicilio_cliente":           "empresa_cliente.direccion_principal",
        "representante_cliente":       "representante_cliente.usuario.get_nombre_completo",
        "rut_representante_cliente":   "representante_cliente.usuario.rut",
        # proveedor (prestadora)
        "nombre_proveedor":            "empresa_prestadora.nombre",
        "rut_proveedor":               "empresa_prestadora.rut_empresa",
        "domicilio_proveedor":         "empresa_prestadora.direccion_principal",
        "representante_proveedor":     "representante_proveedor.usuario.get_nombre_completo",
        "rut_representante_proveedor": "representante_proveedor.usuario.rut",
        # contrato
        "nombre_contrato":             "contrato.nombre",
        "fecha_inicio_contrato":       "contrato.fecha_inicio",
        "fecha_fin_contrato":          "contrato.fecha_fin",
        "moneda_contrato":             "contrato.moneda_cobro",
        "vigencia_meses":              "calculado:vigencia_meses",
        "lugar_firma":                 "contrato.lugar_firma",
        "fecha_firma":                 "contrato.fecha_firma",
        # servicio / venta (item comercial — primera linea)
        "nombre_plan":                  "items_comerciales[0].snapshot_nombre",
        "descripcion_servicio":         "items_comerciales[0].snapshot_descripcion",
        "incluye_servicio":             "items_comerciales[0].snapshot_incluye",
        "no_incluye_servicio":          "items_comerciales[0].snapshot_no_incluye",
        "clausulas_especiales_servicio": "items_comerciales[0].snapshot_clausulas",
        "cantidad_contratada":          "items_comerciales[0].cantidad",
        "visitas_mensuales":            "items_comerciales[0].snapshot_num_visitas_mensuales",
        "precio_unitario_mensual":      "items_comerciales[0].precio_unitario_contratado",
        # economico
        "forma_pago":                  "contrato.get_forma_pago_contractual_display",
        "dia_facturacion":             "contrato.dia_facturacion",
        "valor_total":                 "contrato.total_items_comerciales",
        # contrato (venta)
        "renovacion_automatica":       "contrato.renovacion_automatica",
        "dias_aviso_termino":          "contrato.dias_aviso_termino",
        # licencia (primera linea de ContratoLicencia)
        "nombre_licencia":             "licencia_principal.nombre",
        "proveedor_licencia":          "licencia_principal.proveedor",
        "modalidad_licencia":          "licencia_principal.modalidad",
        "cantidad_licencias":          "licencia_principal.cantidad",
        "precio_unitario_licencia":    "licencia_principal.precio_unitario",
        "vigencia_licencia_inicio":    "licencia_principal.fecha_inicio",
        "vigencia_licencia_fin":       "licencia_principal.fecha_fin",
        "valor_total_licencia":        "contrato.snapshot_total_servicios",
    }

    _PREFIJO_A_CATEGORIA: dict[str, str] = {
        "empresa_cliente":         "cliente",
        "representante_cliente":   "cliente",
        "empresa_prestadora":      "proveedor",
        "representante_proveedor": "proveedor",
        "contrato":                "contrato",
        "calculado":               "contrato",
        "items_comerciales[0]":    "servicio",
        "licencia_principal":      "licencia",
    }

    # Categoria por clave para casos donde el prefijo de la ruta no refleja la
    # categoria real (ej. "valor_total" tiene prefijo "contrato." pero es un
    # dato economico, no contractual).
    _CATEGORIA_OVERRIDE: dict[str, str] = {
        "valor_total": "economico",
        "forma_pago": "economico",
        "dia_facturacion": "economico",
        "valor_total_licencia": "economico",
    }

    # Tipos de contrato donde cada clave es relevante. Las claves ausentes de
    # este diccionario se consideran comunes a los 3 tipos (cliente, proveedor,
    # datos generales del contrato, firma). Ampliar aqui cuando se agreguen
    # etiquetas nuevas que no apliquen a los 3 tipos por igual.
    _TIPOS_APLICABLES: dict[str, tuple[str, ...]] = {
        # servicios + venta: comparten ContratoItemComercial como linea principal.
        "nombre_plan":                   ("servicios", "venta"),
        "descripcion_servicio":          ("servicios", "venta"),
        "incluye_servicio":              ("servicios", "venta"),
        "no_incluye_servicio":           ("servicios", "venta"),
        "clausulas_especiales_servicio": ("servicios", "venta"),
        "cantidad_contratada":           ("servicios", "venta"),
        "visitas_mensuales":             ("servicios", "venta"),
        "precio_unitario_mensual":       ("servicios", "venta"),
        "valor_total":                   ("servicios", "venta"),
        # servicios + licencia: comparten facturacion recurrente (mensual/anual),
        # segun el propio help_text de snapshot_total_servicios en models.py.
        "forma_pago":                    ("servicios", "licencia"),
        "dia_facturacion":               ("servicios", "licencia"),
        # venta unicamente: pago en cuotas y cotizaciones vinculadas — gateado
        # explicitamente por tipo=="venta" en funciones.py:728 (motor v1).
        "forma_pago_venta":                 ("venta",),
        "cantidad_cuotas_venta":             ("venta",),
        "cuotas_venta_tabla":                ("venta",),
        "cotizaciones_tabla":                ("venta",),
        "cantidad_cotizaciones":             ("venta",),
        "total_cotizaciones":                ("venta",),
        "cotizaciones_totales_convertidos":  ("venta",),
        "dolar_observado_cotizaciones":      ("venta",),
        # licencia unicamente.
        "nombre_licencia":            ("licencia",),
        "proveedor_licencia":         ("licencia",),
        "modalidad_licencia":         ("licencia",),
        "cantidad_licencias":         ("licencia",),
        "precio_unitario_licencia":   ("licencia",),
        "vigencia_licencia_inicio":   ("licencia",),
        "vigencia_licencia_fin":      ("licencia",),
        "valor_total_licencia":       ("licencia",),
        "licenciatarios_tabla":       ("licencia",),
    }
    _TIPOS_COMUNES: tuple[str, ...] = ("servicios", "venta", "licencia")

    # Claves sin origen_dato navegable: se resuelven antes de llegar al
    # adaptador, en motor_plantillas_v2._CLAVES_ESPECIALES_B2B (cotizaciones,
    # cuotas de venta) o directamente en este adaptador (licenciatarios_tabla).
    # Se listan aqui solo para que aparezcan en el catalogo del editor v2.9.
    _CLAVES_SIN_RUTA: dict[str, dict] = {
        "cotizaciones_tabla":                {"nombre_display": "Tabla de Cotizaciones Vinculadas", "categoria": "economico"},
        "cantidad_cotizaciones":             {"nombre_display": "Cantidad de Cotizaciones Vinculadas", "categoria": "economico"},
        "total_cotizaciones":                {"nombre_display": "Total Consolidado de Cotizaciones", "categoria": "economico"},
        "forma_pago_venta":                  {"nombre_display": "Forma de Pago Venta", "categoria": "economico"},
        "cantidad_cuotas_venta":              {"nombre_display": "Cantidad de Cuotas Venta", "categoria": "economico"},
        "cuotas_venta_tabla":                 {"nombre_display": "Tabla de Cuotas Venta", "categoria": "economico"},
        "cotizaciones_totales_convertidos":   {"nombre_display": "Totales Convertidos de Cotizaciones", "categoria": "economico"},
        "dolar_observado_cotizaciones":       {"nombre_display": "Dolar Observado por Cotizacion", "categoria": "economico"},
        "licenciatarios_tabla":               {"nombre_display": "Tabla de Licenciatarios", "categoria": "licencia"},
    }

    # Rol del firmante (texto usado en el nodo 'firma' de la plantilla) →
    # alias de nombre/RUT de quien firma en su representacion. El "proveedor"
    # (servicios/venta/licencia) y el "cliente" firman a traves de su
    # representante legal, no como la empresa misma.
    _ROL_A_ALIAS_FIRMANTE: dict[str, tuple[str, str]] = {
        "Proveedor":     ("representante_proveedor", "rut_representante_proveedor"),
        "Vendedor":      ("representante_proveedor", "rut_representante_proveedor"),
        "Licenciante":   ("representante_proveedor", "rut_representante_proveedor"),
        "Cliente":       ("representante_cliente", "rut_representante_cliente"),
        "Comprador":     ("representante_cliente", "rut_representante_cliente"),
        "Licenciatario": ("representante_cliente", "rut_representante_cliente"),
    }

    def datos_firmante(self, rol: str) -> tuple[str, str] | None:
        alias = self._ROL_A_ALIAS_FIRMANTE.get(rol)
        if not alias:
            return None
        nombre_clave, rut_clave = alias
        nombre = self.resolver_ruta_extendida(nombre_clave)
        rut = self.resolver_ruta_extendida(rut_clave)
        return (
            nombre if isinstance(nombre, str) else "",
            rut if isinstance(rut, str) else "",
        )

    @classmethod
    def catalogo_etiquetas(cls, tipo_contrato: str = "servicios") -> list[dict]:
        catalogo = []
        for i, (clave, ruta) in enumerate(cls._ALIAS.items()):
            if tipo_contrato not in cls._TIPOS_APLICABLES.get(clave, cls._TIPOS_COMUNES):
                continue
            categoria = cls._CATEGORIA_OVERRIDE.get(clave)
            if categoria is None:
                prefijo = ruta.split(":")[0] if ruta.startswith("calculado:") else ruta.split(".")[0]
                categoria = cls._PREFIJO_A_CATEGORIA.get(prefijo, "custom")
            catalogo.append({
                "id": i,
                "empresa_prestadora": None,
                "clave": clave,
                "nombre_display": clave.replace("_", " ").title(),
                "categoria": categoria,
                "tipo_contrato": tipo_contrato,
                "origen_dato": ruta,
                "descripcion": None,
                "valor_default": None,
                "fecha_creacion": "",
                "fecha_modificacion": "",
            })
        offset = len(catalogo)
        for j, (clave, meta) in enumerate(cls._CLAVES_SIN_RUTA.items()):
            if tipo_contrato not in cls._TIPOS_APLICABLES.get(clave, cls._TIPOS_COMUNES):
                continue
            catalogo.append({
                "id": offset + j,
                "empresa_prestadora": None,
                "clave": clave,
                "nombre_display": meta["nombre_display"],
                "categoria": meta["categoria"],
                "tipo_contrato": tipo_contrato,
                "origen_dato": None,
                "descripcion": None,
                "valor_default": None,
                "fecha_creacion": "",
                "fecha_modificacion": "",
            })
        return sorted(catalogo, key=lambda x: (x["categoria"], x["clave"]))


# ---------------------------------------------------------------------------
# Adaptador Trabajador
# ---------------------------------------------------------------------------

class AdaptadorContratoTrabajador(IContratoBase):
    """
    Adaptador para ``rrhh.ContratoTrabajador``.

    Resuelve rutas especificas del dominio laboral (trabajador.*, empresa.*,
    contrato.*, remuneracion.*, prevision.*, firma.*).
    """

    def __init__(self, contrato_trabajador):
        self._c = contrato_trabajador
        self._ue = contrato_trabajador.usuario_empresa
        self._user = self._ue.usuario if self._ue else None
        # La empresa empleadora es la empresa de la sucursal del UsuarioEmpresa.
        self._empresa = (
            self._ue.sucursal.empresa
            if self._ue and self._ue.sucursal_id
            else None
        )

    @property
    def instancia(self):
        return self._c

    @property
    def tipo(self) -> str:
        return "trabajador"

    @property
    def nombre(self) -> str:
        if self._c.referencia_interna:
            return self._c.referencia_interna
        nombre_t = self._user.get_nombre_completo() if self._user else "Trabajador"
        return f"Contrato de Trabajo - {nombre_t}"

    @property
    def estado(self) -> str:
        return getattr(self._c, "estado", "") or ""

    @property
    def empresa_prestadora(self):
        # En contratos laborales, la "prestadora" del PDF es la empresa empleadora.
        return self._empresa

    @property
    def plantilla(self):
        return self._c.plantilla_contrato

    def secciones_generadas_qs(self) -> QuerySet:
        from contratos.models import SeccionContratoGenerada
        return SeccionContratoGenerada.objects.filter(contrato_trabajador=self._c)

    def crear_seccion_generada(self, *, seccion_plantilla, titulo, contenido_renderizado, orden):
        from contratos.models import SeccionContratoGenerada
        return SeccionContratoGenerada.objects.create(
            contrato_trabajador=self._c,
            seccion_plantilla=seccion_plantilla,
            titulo=titulo,
            contenido_renderizado=contenido_renderizado,
            orden=orden,
        )

    def set_plantilla_version_usada(self, version_str: str) -> None:
        # ContratoTrabajador no posee campo plantilla_version_usada; no-op.
        return None

    # ----- Helpers internos -----
    def _format_date(self, value) -> str:
        if not value:
            return ""
        try:
            return value.strftime("%d/%m/%Y")
        except AttributeError:
            return str(value)

    def _format_decimal(self, value) -> str:
        if value in (None, ""):
            return ""
        try:
            num = float(value)
        except (TypeError, ValueError):
            return str(value)
        # Pesos chilenos sin decimales por convencion.
        return f"{num:,.0f}".replace(",", ".")

    _DIAS_SEMANA_MAP = {
        "L": "Lunes", "M": "Martes", "X": "Miércoles",
        "J": "Jueves", "V": "Viernes", "S": "Sábado", "D": "Domingo",
    }
    _DIAS_SEMANA_ORDEN = ["L", "M", "X", "J", "V", "S", "D"]

    def _build_dias_semana_texto(self) -> str:
        """Nombres completos de los dias trabajados; si forman un rango
        contiguo (ej. L-V), lo expresa como "de Lunes a Viernes" en vez de
        listar cada dia."""
        dias = self._c.dias_semana or []
        if not dias:
            return ""

        orden = self._DIAS_SEMANA_ORDEN
        # Posiciones ordenadas segun la semana, ignorando codigos desconocidos.
        posiciones = sorted(orden.index(d) for d in dias if d in orden)
        es_rango_contiguo = (
            len(posiciones) > 1
            and posiciones == list(range(posiciones[0], posiciones[-1] + 1))
        )
        if es_rango_contiguo:
            inicio = self._DIAS_SEMANA_MAP[orden[posiciones[0]]]
            fin = self._DIAS_SEMANA_MAP[orden[posiciones[-1]]]
            return f"de {inicio} a {fin}"

        nombres = [self._DIAS_SEMANA_MAP.get(d, d) for d in dias]
        if len(nombres) == 1:
            return nombres[0]
        return ", ".join(nombres[:-1]) + f" y {nombres[-1]}"

    def _sueldo_en_palabras(self, value) -> str:
        """Convierte un monto a palabras (CLP)."""
        if value in (None, ""):
            return ""
        try:
            num = int(float(value))
        except (TypeError, ValueError):
            return ""
        if num <= 0:
            return ""
        try:
            from num2words import num2words
        except ImportError:
            _logger.error(
                "num2words no esta instalado: el monto en palabras del contrato "
                "quedara vacio en la clausula de remuneracion. Agregar num2words a req.txt."
            )
            return ""
        try:
            return num2words(num, lang="es") + " pesos"
        except Exception:
            _logger.exception("num2words fallo al convertir el monto %s a palabras", num)
            return ""

    def _calcular_sueldo_liquido_num(self):
        """
        Retorna el sueldo líquido estimado como float o None.
        Si tipo_sueldo='liquido': el sueldo almacenado ya es el líquido.
        Si tipo_sueldo='base': aplica descuentos previsionales activos.
        """
        sueldo = self._c.sueldo
        if not sueldo:
            return None
        sueldo_f = float(sueldo)
        if self._c.tipo_sueldo == "liquido":
            return sueldo_f
        descuento = 0.0
        if self._c.descuento_prevision_activo:
            descuento += sueldo_f * 0.10
        if self._c.descuento_salud_activo:
            descuento += sueldo_f * 0.07
        return max(0.0, sueldo_f - descuento)

    def _calcular_sueldo_liquido(self) -> str:
        num = self._calcular_sueldo_liquido_num()
        return self._format_decimal(num) if num is not None else ""

    def _build_vigencia_descripcion(self) -> str:
        """Texto legal de vigencia según tipo de contrato."""
        tipo = self._c.tipo_contrato
        inicio = self._format_date(self._c.fecha_inicio)
        if tipo == "indefinido":
            return f"Contrato de duración indefinida, con inicio el {inicio}."
        if tipo == "plazo_fijo":
            termino = self._format_date(self._c.fecha_termino)
            meses = self._c.cantidad_meses
            if meses:
                return f"Contrato a plazo fijo de {meses} mes(es), del {inicio} al {termino}."
            return f"Contrato a plazo fijo del {inicio} al {termino}."
        if tipo == "reemplazo":
            nombre = ""
            reemplazado = self._c.trabajador_reemplazado
            if reemplazado and reemplazado.usuario:
                nombre = reemplazado.usuario.get_nombre_completo()
            causal = self._c.get_causal_reemplazo_display() or ""
            return (
                f"Contrato de reemplazo de {nombre} por {causal}, "
                f"con inicio el {inicio}."
            )
        return f"Vigente desde el {inicio}."

    def _build_jornada_descripcion(self) -> str:
        """Texto descriptivo de la jornada laboral."""
        jornada = self._c.jornada
        if jornada == "turnos":
            snapshot = getattr(self._c, "grupo_turno_snapshot", None)
            if snapshot:
                return f"Jornada por turnos rotativos — Grupo: {snapshot.get('nombre', '')}."
            if self._c.grupo_turno_id:
                return f"Jornada por turnos rotativos — Grupo: {self._c.grupo_turno.nombre}."
            return "Jornada por turnos rotativos."
        horas = self._c.horas_semanales
        hora_inicio = self._c.hora_inicio.strftime("%H:%M") if self._c.hora_inicio else ""
        hora_fin = self._c.hora_fin.strftime("%H:%M") if self._c.hora_fin else ""
        dias = self._build_dias_semana_texto()
        partes = []
        if jornada == "completa":
            partes.append("Jornada laboral completa")
        elif jornada == "parcial":
            partes.append("Jornada laboral parcial")
        if horas:
            partes.append(f"de {horas} horas semanales")
        if dias:
            # dias ya viene como "de Lunes a Viernes" (rango) o
            # "Lunes, Martes y Miércoles" (lista) segun _build_dias_semana_texto.
            partes.append(dias if dias.startswith("de ") else f"los días {dias}")
        if hora_inicio and hora_fin:
            partes.append(f"de {hora_inicio} a {hora_fin} horas")
        colacion = self._c.tiempo_colacion
        if colacion:
            partes.append(f"con {colacion} minutos de colación")
        return (", ".join(partes) + ".") if partes else ""

    def _build_gratificacion_descripcion(self) -> str:
        """Texto legal de la gratificación."""
        tipo = self._c.tipo_gratificacion
        if tipo == "art_47":
            return "Gratificación anual según Art. 47 del Código del Trabajo."
        if tipo == "art_50_mensual":
            return "Gratificación mensual garantizada según Art. 50 del Código del Trabajo."
        return "Sin gratificación legal acordada."

    def _build_salud_descripcion(self) -> str:
        """Texto descriptivo del sistema de salud."""
        if not self._ue:
            return ""
        sistema = self._ue.sistema_salud or ""
        if sistema == "fonasa":
            return "FONASA"
        if sistema == "isapre":
            nombre = self._ue.nombre_isapre or "Isapre"
            return f"Isapre {nombre}"
        otro = getattr(self._ue, "sistema_salud_otro", None) or getattr(self._c, "sistema_salud_otro", None) or ""
        if otro:
            return f"Sistema de salud: {otro}"
        return self._ue.get_sistema_salud_display() if sistema else ""

    # Alias de claves cortas → rutas completas del adaptador.
    # Permite usar [nombre_afp] en plantillas sin registrar EtiquetaPlantilla en BD.
    # Fuente de verdad única: este diccionario. Ampliar aquí cuando se agreguen etiquetas.
    _ALIAS: dict[str, str] = {
        # trabajador
        "nombre_trabajador":        "trabajador.nombre_completo",
        "rut_trabajador":           "trabajador.rut",
        "direccion_trabajador":     "trabajador.direccion",
        "telefono_trabajador":      "trabajador.celular",
        "email_trabajador":         "trabajador.email",
        "nacionalidad":             "trabajador.nacionalidad",
        "estado_civil":             "contrato.estado_civil",
        "profesion_u_oficio":       "contrato.profesion_u_oficio",
        # empresa / empleador
        "nombre_empresa":           "empresa.nombre",
        "rut_empresa":              "empresa.rut_empresa",
        "domicilio_empresa":        "empresa.direccion_principal",
        "representante_legal":      "empresa.representante_legal",
        "rut_representante":        "empresa.rut_representante",
        # contrato
        "nombre_cargo":             "contrato.cargo",
        "funciones_cargo":          "contrato.funciones",
        "lugar_trabajo":            "contrato.lugar_trabajo",
        "fecha_inicio":             "contrato.fecha_inicio",
        "fecha_termino":            "contrato.fecha_termino",
        "tipo_contrato":            "contrato.tipo_contrato",
        "vigencia_descripcion":     "contrato.vigencia_descripcion",
        "jornada_label":            "contrato.jornada",
        "jornada_descripcion":      "contrato.jornada_descripcion",
        "horas_semanales":          "contrato.horas_semanales",
        "hora_inicio":              "contrato.hora_inicio",
        "hora_fin":                 "contrato.hora_fin",
        "dias_semana_texto":        "contrato.dias_semana_texto",
        # remuneración
        "sueldo_base":              "remuneracion.sueldo_base",
        "sueldo_base_palabras":     "remuneracion.sueldo_base_palabras",
        "sueldo_liquido":           "remuneracion.sueldo_liquido",
        "moneda":                   "remuneracion.moneda",
        "gratificacion_legal":      "remuneracion.gratificacion_descripcion",
        "gratificacion_descripcion": "remuneracion.gratificacion_descripcion",
        "bono_movilizacion":        "remuneracion.bono_movilizacion",
        "bono_colacion":            "remuneracion.bono_colacion",
        # previsión
        "nombre_afp":               "prevision.afp_nombre",
        "sistema_salud_label":      "prevision.salud_descripcion",
        "nombre_isapre":            "prevision.nombre_isapre",
        "nombre_banco":             "prevision.banco_nombre",
        "tipo_cuenta_bancaria":     "prevision.tipo_cuenta",
        "numero_cuenta_bancaria":   "prevision.numero_cuenta",
        # firma
        "lugar_firma":              "firma.lugar_firma",
        "fecha_firma":              "firma.fecha_firma",
    }

    # Identidad de las partes y objeto del contrato: nunca deberian exportarse
    # en blanco. No incluye bonos/cuenta bancaria/reemplazo, que son
    # legitimamente vacios cuando no aplican. Tampoco incluye lugar_firma/
    # fecha_firma: se llenan al momento de firmar, no al crear el contrato.
    #
    # "ubicacion" indica donde se resuelve cada campo, para que el frontend
    # pueda ofrecer "volver al paso" (wizard) o avisar que hay que ir a otra
    # pantalla (empresa/trabajador) — ver FIX #8 en dev/docs/rrhh_plan_correcciones.md.
    _CAMPOS_OBLIGATORIOS: dict[str, dict] = {
        "rut_trabajador":      {"label": "RUT del trabajador", "ubicacion": "trabajador"},
        "nombre_trabajador":   {"label": "Nombre del trabajador", "ubicacion": "trabajador"},
        "estado_civil":        {"label": "Estado civil", "ubicacion": "wizard", "paso": 2},
        "rut_empresa":         {"label": "RUT de la empresa", "ubicacion": "empresa"},
        "nombre_empresa":      {"label": "Nombre de la empresa", "ubicacion": "empresa"},
        "representante_legal": {"label": "Representante legal", "ubicacion": "empresa"},
        "rut_representante":   {"label": "RUT del representante legal", "ubicacion": "empresa"},
        "nombre_cargo":        {"label": "Cargo", "ubicacion": "wizard", "paso": 3},
        "funciones_cargo":     {"label": "Funciones del cargo", "ubicacion": "wizard", "paso": 3},
    }

    _PREFIJO_A_CATEGORIA: dict[str, str] = {
        "trabajador":   "trabajador",
        "empresa":      "empleador",
        "contrato":     "contrato",
        "remuneracion": "economico",
        "prevision":    "trabajador",
        "firma":        "contrato",
        "empleador":    "empleador",
        "finiquito":    "contrato",
    }

    def es_campo_obligatorio(self, clave: str) -> bool:
        return clave in self._CAMPOS_OBLIGATORIOS

    def campos_faltantes(self) -> list[dict]:
        """Campos obligatorios cuyo valor resuelto esta vacio, con su
        metadata de ubicacion — usado por el endpoint de pre-validacion
        antes de crear el contrato (FIX #8)."""
        faltantes = []
        for clave, meta in self._CAMPOS_OBLIGATORIOS.items():
            valor = self.resolver_ruta_extendida(clave)
            if not valor or valor is NOT_HANDLED:
                faltantes.append({"clave": clave, **meta})
        return faltantes

    @classmethod
    def campos_faltantes_previos(cls, empresa, usuario_empresa=None) -> list[dict]:
        """Igual que ``campos_faltantes`` pero sin requerir un contrato ya
        guardado — solo evalua los campos de "empresa" (siempre, dependen
        unicamente de la empresa prestadora) y "trabajador" (solo si se pasa
        un ``usuario_empresa`` existente). Los campos "wizard" (estado
        civil, funciones del cargo) no se evaluan aqui: el propio wizard ya
        tiene esos valores en memoria antes de enviarlos.

        Usado por el precheck que se corre ANTES de crear el contrato, para
        pedir los datos faltantes antes de que el contrato exista (ver FIX
        #9 en dev/docs/rrhh_plan_correcciones.md).
        """
        faltantes = []
        for clave, meta in cls._CAMPOS_OBLIGATORIOS.items():
            if meta["ubicacion"] == "empresa":
                valor = getattr(empresa, {
                    "rut_empresa": "rut_empresa",
                    "nombre_empresa": "nombre",
                    "representante_legal": "representante_legal",
                    "rut_representante": "rut_representante",
                }.get(clave, clave), None)
            elif meta["ubicacion"] == "trabajador" and usuario_empresa is not None:
                if clave == "rut_trabajador":
                    valor = usuario_empresa.rut or getattr(usuario_empresa.usuario, "rut", None)
                elif clave == "nombre_trabajador":
                    valor = usuario_empresa.usuario.get_nombre_completo()
                else:
                    continue
            else:
                continue
            if not valor:
                faltantes.append({"clave": clave, **meta})
        return faltantes

    # El "Empleador" firma a traves de su representante legal, no como la
    # empresa misma; el "Trabajador" firma a nombre propio.
    _ROL_A_ALIAS_FIRMANTE: dict[str, tuple[str, str]] = {
        "Empleador": ("representante_legal", "rut_representante"),
        "Trabajador": ("nombre_trabajador", "rut_trabajador"),
    }

    def datos_firmante(self, rol: str) -> tuple[str, str] | None:
        alias = self._ROL_A_ALIAS_FIRMANTE.get(rol)
        if not alias:
            return None
        nombre_clave, rut_clave = alias
        nombre = self.resolver_ruta_extendida(nombre_clave)
        rut = self.resolver_ruta_extendida(rut_clave)
        return (
            nombre if isinstance(nombre, str) else "",
            rut if isinstance(rut, str) else "",
        )

    @classmethod
    def catalogo_etiquetas(cls, tipo_contrato: str = "trabajador") -> list[dict]:
        catalogo = []
        for i, (clave, ruta) in enumerate(cls._ALIAS.items()):
            prefijo = ruta.split(".")[0] if "." in ruta else "contrato"
            categoria = cls._PREFIJO_A_CATEGORIA.get(prefijo, "custom")
            catalogo.append({
                "id": i,
                "empresa_prestadora": None,
                "clave": clave,
                "nombre_display": clave.replace("_", " ").title(),
                "categoria": categoria,
                "tipo_contrato": tipo_contrato,
                "origen_dato": ruta,
                "descripcion": None,
                "valor_default": None,
                "fecha_creacion": "",
                "fecha_modificacion": "",
            })
        return sorted(catalogo, key=lambda x: (x["categoria"], x["clave"]))

    # ----- Resolucion de rutas -----
    # Clave corta -> campo override en ContratoTrabajador. Permite que FIX #8
    # ("guardar solo para este contrato") sobrescriba un dato que normalmente
    # vive en Empresa/Usuario (compartido entre contratos) sin tocar el
    # registro compartido. Se revisa antes que la resolucion normal.
    _CLAVE_A_OVERRIDE: dict[str, str] = {
        "rut_empresa": "rut_empresa_override",
        "representante_legal": "representante_legal_override",
        "rut_representante": "rut_representante_override",
        "rut_trabajador": "rut_trabajador_override",
    }

    def resolver_ruta_extendida(self, ruta, default=None):
        if not ruta or not isinstance(ruta, str):
            return NOT_HANDLED

        override_field = self._CLAVE_A_OVERRIDE.get(ruta)
        if override_field:
            valor_override = getattr(self._c, override_field, None)
            if valor_override:
                return valor_override

        # Expandir alias cortos antes de parsear prefijos.
        # Solo se expande si la clave no contiene punto (ya es ruta completa).
        if "." not in ruta:
            ruta = self._ALIAS.get(ruta, ruta)

        # Soportar prefijo opcional 'contrato_trabajador.' y 'contrato.' como alias.
        partes = ruta.split(".")
        if not partes:
            return NOT_HANDLED

        prefijo = partes[0]
        resto = partes[1:]

        # ----- trabajador.{campo} -----
        if prefijo == "trabajador":
            if not self._user:
                return default or ""
            mapping = {
                "nombre": self._user.get_nombre_completo() if self._user else "",
                "nombre_completo": self._user.get_nombre_completo() if self._user else "",
                "first_name": self._user.first_name or "",
                "second_name": self._user.second_name or "" if hasattr(self._user, "second_name") else "",
                "last_name": self._user.last_name or "",
                "second_last_name": self._user.second_last_name or "" if hasattr(self._user, "second_last_name") else "",
                "nombre_apellido": f"{self._user.first_name} {self._user.last_name}",
                # El wizard de creacion guarda el RUT en UsuarioEmpresa.rut (no en
                # User.rut); se prioriza esa fuente y se cae a User.rut solo por
                # compatibilidad con datos antiguos que lo hayan tenido ahi.
                "rut": (getattr(self._ue, "rut", "") or getattr(self._user, "rut", "") or ""),
                "email": self._user.email or "",
                "direccion": getattr(self._user, "direccion", "") or "",
                "telefono": getattr(self._user, "celular", "") or "",
                "celular": getattr(self._user, "celular", "") or "",
                "fecha_nacimiento": self._format_date(getattr(self._user, "fecha_nacimiento", None)),
                "nacionalidad": getattr(self._user, "nacionalidad", "") or "",
                # genero: label legible en lugar del código crudo ('0','1','2')
                "genero": self._user.get_genero_display() if getattr(self._user, "genero", None) else "",
                # nivel de estudios y título
                "nivel_estudios": self._user.get_nivel_estudios_display() if getattr(self._user, "nivel_estudios", None) else "",
                "titulo_especialidad": getattr(self._user, "titulo_especialidad", "") or "",
                # estado_civil y profesion_u_oficio viven en el contrato (Art. 10 CT)
                "estado_civil": self._c.get_estado_civil_display() if self._c.estado_civil else "",
                "profesion_u_oficio": self._c.profesion_u_oficio or "",
            }
            if resto and resto[0] in mapping:
                return mapping[resto[0]]
            return default or ""

        # ----- empresa.{campo} y empresa_prestadora.{campo} (alias) -----
        if prefijo in ("empresa", "empresa_prestadora", "empleador"):
            if not self._empresa:
                return default or ""
            campo = resto[0] if resto else None
            if not campo:
                return default or ""
            # empresa.ciudad: Empresa no tiene campo ciudad; usa direccion_principal
            # como fallback hasta que se agregue el campo (ver TODO abajo).
            # TODO (Mejora futura, Opción A): agregar CharField ciudad a Empresa y
            # eliminar este bloque especial.
            if campo == "ciudad":
                return (
                    getattr(self._empresa, "ciudad", None)
                    or getattr(self._empresa, "direccion_principal", "")
                    or ""
                )
            valor = getattr(self._empresa, campo, None)
            if valor is None:
                return default or ""
            if callable(valor):
                valor = valor()
            return str(valor)

        # ----- contrato.{campo} y contrato_trabajador.{campo} (alias) -----
        if prefijo in ("contrato", "contrato_trabajador"):
            campo = resto[0] if resto else None
            if not campo:
                return default or ""

            # Campos formateados especiales
            if campo == "fecha_inicio":
                return self._format_date(self._c.fecha_inicio)
            if campo == "fecha_termino":
                return self._format_date(self._c.fecha_termino)
            if campo == "fecha_firma":
                return self._format_date(self._c.fecha_firma)

            # Choices con label legible
            if campo == "tipo_contrato":
                return self._c.get_tipo_contrato_display() or ""
            if campo == "jornada":
                return self._c.get_jornada_display() or ""
            if campo == "motivo_termino":
                return self._c.get_motivo_termino_display() or ""

            # Causal de reemplazo con label legible
            if campo in ("causal_reemplazo", "causal_reemplazo_label"):
                return self._c.get_causal_reemplazo_display() or ""

            # Trabajador reemplazado
            if campo == "nombre_reemplazado":
                reemplazado = self._c.trabajador_reemplazado
                if reemplazado and reemplazado.usuario:
                    return reemplazado.usuario.get_nombre_completo()
                return default or ""
            if campo == "rut_reemplazado":
                reemplazado = self._c.trabajador_reemplazado
                if reemplazado and reemplazado.usuario:
                    return getattr(reemplazado.usuario, "rut", "") or ""
                return default or ""

            # Hora de jornada fija
            if campo == "hora_inicio":
                return self._c.hora_inicio.strftime("%H:%M") if self._c.hora_inicio else ""
            if campo == "hora_fin":
                return self._c.hora_fin.strftime("%H:%M") if self._c.hora_fin else ""

            # Textos construidos
            if campo == "vigencia_descripcion":
                return self._build_vigencia_descripcion()
            if campo == "jornada_descripcion":
                return self._build_jornada_descripcion()
            if campo == "dias_semana_texto":
                return self._build_dias_semana_texto()

            # Campos en el contrato (Art. 10 CT)
            if campo == "estado_civil":
                return self._c.get_estado_civil_display() if self._c.estado_civil else ""
            if campo == "profesion_u_oficio":
                return self._c.profesion_u_oficio or ""
            if campo == "cantidad_meses":
                return str(self._c.cantidad_meses) if self._c.cantidad_meses else ""

            # Compatibilidad con etiquetas globales B2B reusadas (colision de
            # claves). En B2B el origen es ``contrato.get_moneda_cobro_display``
            # y aqui el campo equivalente es ``moneda``.
            if campo == "get_moneda_cobro_display":
                return self._c.moneda or ""

            valor = getattr(self._c, campo, None)
            if valor is None:
                return default or ""
            if callable(valor):
                valor = valor()
            return str(valor)

        # ----- remuneracion.{campo} -----
        if prefijo == "remuneracion":
            campo = resto[0] if resto else None
            _liquido_num = self._calcular_sueldo_liquido_num()
            mapping = {
                # Sueldo
                "sueldo":                  self._format_decimal(self._c.sueldo),
                "sueldo_palabras":         self._sueldo_en_palabras(self._c.sueldo),
                "tipo_sueldo":             self._c.get_tipo_sueldo_display() or "",
                "tipo_sueldo_label":       "sueldo base" if self._c.tipo_sueldo == "base" else "sueldo líquido",
                # Aliases backward-compat
                "sueldo_base":             self._format_decimal(self._c.sueldo),
                "sueldo_base_palabras":    self._sueldo_en_palabras(self._c.sueldo),
                # Sueldo líquido calculado
                "sueldo_liquido":          self._format_decimal(_liquido_num) if _liquido_num is not None else "",
                "sueldo_liquido_palabras": self._sueldo_en_palabras(_liquido_num) if _liquido_num is not None else "",
                # Moneda y gratificación
                "moneda":                  self._c.moneda or "",
                "tipo_gratificacion":      self._c.get_tipo_gratificacion_display() or "",
                "gratificacion_legal":     "Sí" if self._c.tipo_gratificacion != "no_aplica" else "No",
                "gratificacion_descripcion": self._build_gratificacion_descripcion(),
                # Bonos — devuelven vacío si el bono no está activo
                "bono_movilizacion": (
                    self._format_decimal(self._c.bono_movilizacion)
                    if getattr(self._c, "bono_movilizacion_activo", False)
                    else ""
                ),
                "bono_colacion": (
                    self._format_decimal(self._c.bono_colacion)
                    if getattr(self._c, "bono_colacion_activo", False)
                    else ""
                ),
                "tiene_bono_movilizacion": "Sí" if getattr(self._c, "bono_movilizacion_activo", False) else "No",
                "tiene_bono_colacion":     "Sí" if getattr(self._c, "bono_colacion_activo", False) else "No",
                # Descuentos previsionales
                "descuento_prevision": "Sí" if self._c.descuento_prevision_activo else "No",
                "descuento_salud":     "Sí" if self._c.descuento_salud_activo else "No",
            }
            if campo in mapping:
                return mapping[campo]
            return default or ""

        # ----- prevision.{campo} -----
        if prefijo == "prevision":
            if not self._ue:
                return default or ""
            campo = resto[0] if resto else None
            mapping = {
                "afp": self._ue.afp.nombre if self._ue.afp else "",
                "afp_nombre": self._ue.afp.nombre if self._ue.afp else "",
                "sistema_salud": self._ue.get_sistema_salud_display() or "" if self._ue.sistema_salud else "",
                "salud_codigo": self._ue.sistema_salud or "",
                "salud_descripcion": self._build_salud_descripcion(),
                "salud_isapre": self._ue.nombre_isapre or "",
                "nombre_isapre": self._ue.nombre_isapre or "",
                "banco": self._ue.banco or "",
                "banco_nombre": self._ue.banco or "",
                "tipo_cuenta": self._ue.get_tipo_cuenta_bancaria_display() or "" if self._ue.tipo_cuenta_bancaria else "",
                "tipo_cuenta_codigo": self._ue.tipo_cuenta_bancaria or "",
                "numero_cuenta": self._ue.numero_cuenta_bancaria or "",
            }
            if campo in mapping:
                return mapping[campo]
            return default or ""

        # ----- firma.{campo} (datos de la firma del contrato) -----
        if prefijo == "firma":
            campo = resto[0] if resto else None
            mapping = {
                "lugar_firma": self._c.lugar_celebracion_contrato or "",
                "fecha_firma": self._format_date(self._c.fecha_firma),
            }
            if campo in mapping:
                return mapping[campo]
            return default or ""

        # ----- empleador.{campo} (vínculo laboral del UsuarioEmpresa) -----
        if prefijo == "empleador":
            if not self._ue:
                return default or ""
            campo = resto[0] if resto else None
            mapping = {
                "fecha_ingreso": self._format_date(self._ue.fecha_ingreso),
            }
            if campo in mapping:
                return mapping[campo]
            return default or ""

        # ----- jornada.{campo} (grupo de turnos, leido desde snapshot) -----
        if prefijo == "jornada":
            campo = resto[0] if resto else None
            if not campo:
                return default or ""
            contrato = self._c
            snapshot = getattr(contrato, "grupo_turno_snapshot", None)

            if campo == "grupo_nombre":
                if snapshot:
                    return snapshot.get("nombre") or (default or "")
                if contrato.grupo_turno_id:
                    return contrato.grupo_turno.nombre or (default or "")
                return default or ""

            elif campo == "ciclo":
                ciclos = {
                    "semanal": "Semanal",
                    "quincenal": "Quincenal",
                    "mensual": "Mensual",
                }
                if snapshot:
                    return ciclos.get(snapshot.get("ciclo", ""), default or "") or (default or "")
                if contrato.grupo_turno_id:
                    return ciclos.get(contrato.grupo_turno.ciclo, default or "") or (default or "")
                return default or ""

            elif campo == "tabla_slots":
                import json as _json
                slots = None
                if snapshot:
                    slots = snapshot.get("slots", [])
                elif contrato.grupo_turno_id:
                    slots = [
                        {
                            "orden": s.orden,
                            "nombre": s.turno.nombre,
                            "hora_inicio": str(s.turno.hora_inicio),
                            "hora_fin": str(s.turno.hora_fin),
                        }
                        for s in contrato.grupo_turno.slots.select_related("turno").order_by("orden")
                    ]
                if not slots:
                    return getattr(contrato, "horario_detalle", None) or (default or "")
                # Marcador especial: el generador PDF (funciones_v2.py) lo convierte
                # en una Table ReportLab con estilos, evitando HTML crudo sin estilos.
                return f"__TABLA_TURNOS_JSON__{_json.dumps(slots)}__END_TABLA__"

            return default or ""

        # ----- finiquito.{campo} -----
        if prefijo == "finiquito":
            finiquito = getattr(self._c, "finiquito", None)
            if not finiquito:
                return default or ""
            campo = resto[0] if resto else None
            mapping = {
                "total_neto":       self._format_decimal(finiquito.total_neto),
                "total_bruto":      self._format_decimal(finiquito.total_bruto),
                "total_descuentos": self._format_decimal(finiquito.total_descuentos),
                "estado":           finiquito.get_estado_display(),
                "fecha_firma":      self._format_date(finiquito.fecha_firma),
                "motivo_termino":   self._c.get_motivo_termino_display() or "",
                "fecha_termino":    self._format_date(self._c.fecha_termino_real or self._c.fecha_termino),
            }
            return mapping.get(campo, default or "")

        # No es una ruta del dominio laboral.
        return NOT_HANDLED


class AdaptadorFiniquito(AdaptadorContratoTrabajador):
    """
    Adaptador para generar el PDF de un ``FiniquitoContrato``.

    Subclase de ``AdaptadorContratoTrabajador`` que sobreescribe:
    - ``plantilla``: usa la plantilla tipo 'finiquito' en vez del contrato.
    - ``nombre``: título del documento PDF.

    Garantiza que las secciones generadas se vinculen a la plantilla de
    finiquito, aislándolas de las secciones del contrato base.
    """

    def __init__(self, contrato_trabajador, finiquito_plantilla, finiquito):
        super().__init__(contrato_trabajador)
        self._finiquito_plantilla = finiquito_plantilla
        self._finiquito_obj = finiquito

    @property
    def plantilla(self):
        return self._finiquito_plantilla

    @property
    def nombre(self) -> str:
        return "FINIQUITO DE CONTRATO DE TRABAJO"
