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

from abc import ABC, abstractmethod
from typing import Any, Optional

from django.db.models import QuerySet
from django.utils.html import escape


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


# ---------------------------------------------------------------------------
# Adaptador B2B
# ---------------------------------------------------------------------------

class AdaptadorContratoB2B(IContratoBase):
    """
    Adaptador para ``ContratoEmpresaCliente``.

    Delega toda la resolucion de etiquetas y la generacion de PDF al motor v1
    existente, retornando ``NOT_HANDLED`` en ``resolver_ruta_extendida`` para
    que el motor v2 caiga al ``_resolver_ruta`` original.
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

    def resolver_ruta_extendida(self, ruta, default=None):
        # B2B no aporta rutas extras: el motor v2 hara fallback al motor v1.
        return NOT_HANDLED


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

    def _sueldo_en_palabras(self, value) -> str:
        """Convierte un monto a palabras (CLP). Falla silenciosa si num2words falta."""
        if value in (None, ""):
            return ""
        try:
            from num2words import num2words  # type: ignore
            return num2words(int(value), lang="es") + " pesos"
        except Exception:
            return ""

    # ----- Resolucion de rutas -----
    def resolver_ruta_extendida(self, ruta, default=None):
        if not ruta or not isinstance(ruta, str):
            return NOT_HANDLED

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
                "last_name": self._user.last_name or "",
                "rut": getattr(self._user, "rut", "") or "",
                "email": self._user.email or "",
                "direccion": getattr(self._user, "direccion", "") or "",
                "telefono": getattr(self._user, "celular", "") or "",
                "celular": getattr(self._user, "celular", "") or "",
                "fecha_nacimiento": self._format_date(getattr(self._user, "fecha_nacimiento", None)),
                "nacionalidad": getattr(self._user, "nacionalidad", "") or "",
                "estado_civil": getattr(self._user, "estado_civil", "") or "",
                "genero": getattr(self._user, "genero", "") or "",
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
            mapping = {
                "sueldo_base": self._format_decimal(self._c.sueldo_base),
                "sueldo_liquido": self._format_decimal(self._c.sueldo_liquido),
                "sueldo_liquido_palabras": self._sueldo_en_palabras(self._c.sueldo_liquido),
                "sueldo_base_palabras": self._sueldo_en_palabras(self._c.sueldo_base),
                "moneda": self._c.moneda or "",
                "tipo_gratificacion": self._c.get_tipo_gratificacion_display() or "",
                # Compatibilidad con plantillas antiguas que esperan un booleano.
                "gratificacion_legal": "Si" if self._c.tipo_gratificacion != "no_aplica" else "No",
                "bono_movilizacion": self._format_decimal(self._c.bono_movilizacion),
                "bono_colacion": self._format_decimal(self._c.bono_colacion),
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
                filas = "".join(
                    f"<tr><td>{s['orden'] + 1}</td><td>{escape(s['nombre'])}</td>"
                    f"<td>{escape(str(s['hora_inicio']))}–{escape(str(s['hora_fin']))}</td></tr>"
                    for s in slots
                )
                return (
                    f"<table><thead><tr><th>#</th><th>Turno</th><th>Horario</th></tr></thead>"
                    f"<tbody>{filas}</tbody></table>"
                )

            return default or ""

        # No es una ruta del dominio laboral.
        return NOT_HANDLED
