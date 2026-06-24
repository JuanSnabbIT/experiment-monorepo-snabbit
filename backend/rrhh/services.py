# backend/rrhh/services.py

"""
Servicio de lógica de negocio para contratos laborales.

Este módulo centraliza toda la lógica de negocio del módulo RRHH.
Todas las operaciones críticas son atómicas usando @transaction.atomic.

Uso:
    from rrhh.services import RRHHContratosService

    contrato = RRHHContratosService.cambiar_estado_a_vigente(
        contrato_id=123,
        usuario=request.user
    )
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import (
    ContratoTrabajador,
    AnexoContrato,
    EnvioAprobacionEmpleador,
)
from .estados_modelo import (
    TRANSICIONES_CONTRATO,
    MOTIVO_TERMINO_CONTRATO,
    CAUSALES_CON_INDEMNIZACION,
    CAUSALES_CON_AVISO_PREVIO,
    CAUSALES_CON_RECARGO,
)
from empresas.models import UsuarioEmpresa, SucursalEmpresa
from core.tasks import send_email_task
from contratos.servicio_pdf import generar_pdf as _generar_pdf, PlantillaNoDisponibleError

logger = logging.getLogger(__name__)


class RRHHContratosServiceException(Exception):
    """Excepción base para errores del servicio"""
    pass


class ConflictoVigenteError(Exception):
    """Se lanza cuando ya existe un contrato vigente para el mismo usuario_empresa."""
    def __init__(self, contrato_vigente_id: int, referencia: str):
        self.contrato_vigente_id = contrato_vigente_id
        self.referencia = referencia
        super().__init__(f"Ya existe un contrato vigente: {referencia}")


class RRHHContratosService:
    """
    Servicio centralizado para operaciones sobre contratos laborales.

    Todos los métodos son transaccionales y thread-safe.
    """

    # =====================================================================
    # OPERACIONES CRÍTICAS (ATÓMICAS)
    # =====================================================================

    @staticmethod
    def _build_snapshot_documento(contrato: ContratoTrabajador) -> dict:
        snapshot = {
            "razon_social_empresa": None,
            "rut_empresa": None,
            "direccion_empresa": None,
            "representante_legal": None,
            "nombre_trabajador": None,
            "rut_trabajador": None,
            "direccion_trabajador": None,
        }

        if contrato.usuario_empresa_id:
            ue = contrato.usuario_empresa
            usuario = ue.usuario if ue else None
            empresa = ue.sucursal.empresa if ue and ue.sucursal_id else None

            snapshot["razon_social_empresa"] = getattr(empresa, "nombre", None)
            snapshot["rut_empresa"] = getattr(empresa, "rut", None)
            snapshot["direccion_empresa"] = getattr(empresa, "direccion", None)
            snapshot["representante_legal"] = getattr(empresa, "representante_legal", None)
            snapshot["nombre_trabajador"] = (
                usuario.get_nombre_completo()
                if usuario and hasattr(usuario, "get_nombre_completo")
                else None
            )
            snapshot["rut_trabajador"] = getattr(ue, "rut", None)
            snapshot["direccion_trabajador"] = getattr(usuario, "direccion", None)
            return snapshot

        datos = contrato.datos_trabajador_nuevo or {}
        nombre_nuevo = f"{datos.get('first_name', '')} {datos.get('last_name', '')}".strip()
        snapshot["nombre_trabajador"] = nombre_nuevo or None
        snapshot["rut_trabajador"] = datos.get("rut")
        snapshot["direccion_trabajador"] = datos.get("direccion")
        return snapshot

    @staticmethod
    @transaction.atomic
    def cambiar_estado_a_vigente(contrato_id: int, usuario, accion: str | None = None) -> ContratoTrabajador:
        """
        Cambia contrato de pendiente_aprobacion a vigente.

        Operación ATÓMICA:
        1. Obtiene contrato con lock (select_for_update)
        2. Valida estado y aprobación empleador
        3. Actualiza contrato
        4. Sync UsuarioEmpresa (cargo, fecha_contrato)
        5. Rollback automático si algo falla

        Args:
            contrato_id: ID del contrato a activar
            usuario: Usuario que ejecuta la acción

        Returns:
            ContratoTrabajador actualizado

        Raises:
            ValidationError: Si estado no es pendiente_aprobacion
            ValidationError: Si empleador no aprobó
            UsuarioEmpresa.DoesNotExist: Si no existe trabajador

        Example:
            >>> contrato = RRHHContratosService.cambiar_estado_a_vigente(
            ...     contrato_id=123,
            ...     usuario=request.user
            ... )
            >>> print(contrato.estado)  # 'vigente'
            >>> print(contrato.aceptado_por)  # request.user
        """
        # Lock pessimista: evita race conditions
        contrato = ContratoTrabajador.objects.select_for_update().get(
            pk=contrato_id
        )

        # Validación 1: Estado correcto
        if contrato.estado != "pendiente_aprobacion":
            raise ValidationError({
                "estado": f"Contrato debe estar en 'pendiente_aprobacion', "
                          f"actualmente está en '{contrato.estado}'"
            })

        # Validación 2: Aprobación del empleador (condicional al flujo)
        # - Si existe un envío aprobado (activo o expirado) → se permite siempre.
        # - Si existe un envío activo aún no aprobado → se bloquea.
        # - Sin ningún envío → flujo interno/manual, se permite.
        envio_aprobado = contrato.envios_aprobacion_empleador.filter(
            decision="aprobado"
        ).order_by("-fecha_envio").first()

        if not envio_aprobado:
            envio_pendiente = contrato.envios_aprobacion_empleador.filter(
                expirado=False
            ).order_by("-fecha_envio").first()
            if envio_pendiente and envio_pendiente.decision != "aprobado":
                raise ValidationError({
                    "aprobacion": f"Empleador no aprobó. "
                                  f"Estado: {envio_pendiente.get_decision_display()}"
                })

        # Validación 3: un solo contrato vigente por trabajador
        if contrato.usuario_empresa_id:
            conflicto = ContratoTrabajador.objects.filter(
                usuario_empresa_id=contrato.usuario_empresa_id,
                estado="vigente",
            ).exclude(pk=contrato.pk).first()
            if conflicto:
                if accion != "deprecar_anterior":
                    raise ConflictoVigenteError(
                        contrato_vigente_id=conflicto.pk,
                        referencia=conflicto.referencia_interna or f"Contrato #{conflicto.pk}",
                    )
                conflicto.estado = "terminado"
                conflicto.motivo_termino = "otro"
                conflicto.fecha_termino_real = timezone.now().date()
                conflicto.save(update_fields=["estado", "motivo_termino", "fecha_termino_real", "fecha_modificacion"])

        # Transición atómica
        contrato.estado = "vigente"
        contrato.fecha_aprobacion = timezone.now()
        contrato.aceptado_por = usuario
        # Snapshot inmutable del grupo de turnos al momento de activar
        if contrato.grupo_turno_id and not contrato.grupo_turno_snapshot:
            grupo = contrato.grupo_turno
            contrato.grupo_turno_snapshot = {
                "id": grupo.id,
                "nombre": grupo.nombre,
                "ciclo": grupo.ciclo,
                "slots": [
                    {
                        "orden": slot.orden,
                        "turno_id": slot.turno_id,
                        "nombre": slot.turno.nombre,
                        "hora_inicio": str(slot.turno.hora_inicio),
                        "hora_fin": str(slot.turno.hora_fin),
                        "horas_turno": float(slot.turno.horas_turno) if slot.turno.horas_turno else None,
                    }
                    for slot in grupo.slots.select_related("turno").order_by("orden")
                ],
            }
        contrato.save(update_fields=[
            "estado",
            "fecha_aprobacion",
            "aceptado_por",
            "grupo_turno_snapshot",
            "fecha_modificacion",
        ])

        # Sync UsuarioEmpresa (crítico)
        if contrato.usuario_empresa:
            ue = contrato.usuario_empresa
            ue_updates = []

            if ue.estado != "1":
                ue.estado = "1"
                ue_updates.append("estado")

            if contrato.cargo:
                ue.cargo = contrato.cargo
                ue_updates.append("cargo")

            if contrato.fecha_inicio and not ue.fecha_contrato:
                ue.fecha_contrato = contrato.fecha_inicio
                ue_updates.append("fecha_contrato")

            if ue_updates:
                ue_updates.append("fecha_modificacion")
                ue.save(update_fields=ue_updates)

            user = ue.usuario
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=["is_active"])

        logger.info(
            f"Contrato {contrato_id} activado a vigente por {usuario.id}",
            extra={"contrato_id": contrato_id, "usuario_id": usuario.id}
        )

        return contrato

    @staticmethod
    @transaction.atomic
    def cambiar_estado(
        contrato_id: int,
        nuevo_estado: str,
        usuario = None,
        **kwargs
    ) -> ContratoTrabajador:
        """
        Cambia estado del contrato con validación de máquina de estados.

        Operación ATÓMICA para transiciones complejas (terminar, anular, descartar).

        Args:
            contrato_id: ID del contrato
            nuevo_estado: Estado destino (según TRANSICIONES_CONTRATO)
            usuario: Usuario que ejecuta (requerido para historial)
            **kwargs: Datos contextuales por estado:
                - Para 'terminado': motivo_termino, fecha_termino_real, observaciones_termino
                - Para 'anulado': motivo_anulacion

        Returns:
            ContratoTrabajador con nuevo estado

        Raises:
            ValidationError: Si transición no es permitida
            ValidationError: Si faltan datos requeridos (motivo, etc.)

        Example:
            >>> contrato = RRHHContratosService.cambiar_estado(
            ...     contrato_id=123,
            ...     nuevo_estado="terminado",
            ...     motivo_termino="renuncia",
            ...     fecha_termino_real="2025-06-01",
            ...     usuario=request.user
            ... )
        """
        # Lock pessimista
        contrato = ContratoTrabajador.objects.select_for_update().get(
            pk=contrato_id
        )

        # Validación 1: Transición permitida
        transiciones_permitidas = TRANSICIONES_CONTRATO.get(contrato.estado, [])
        if nuevo_estado not in transiciones_permitidas:
            raise ValidationError({
                "estado": f"No se puede cambiar de '{contrato.estado}' "
                          f"a '{nuevo_estado}'. "
                          f"Transiciones permitidas: {transiciones_permitidas}"
            })

        # Validación 2: Datos requeridos por estado
        if nuevo_estado == "terminado":
            motivo = kwargs.get("motivo_termino", "").strip()
            if not motivo:
                raise ValidationError({
                    "motivo_termino": "Requerido al terminar un contrato"
                })

            # Validar que motivo es válido
            motivos_validos = [m[0] for m in MOTIVO_TERMINO_CONTRATO]
            if motivo not in motivos_validos:
                raise ValidationError({
                    "motivo_termino": f"Motivo inválido. Opciones: {motivos_validos}"
                })

            fecha_termino = kwargs.get("fecha_termino_real") or timezone.now().date()

            # Actualizar campos
            contrato.motivo_termino = motivo
            contrato.fecha_termino_real = fecha_termino

            observaciones = kwargs.get("observaciones_termino")
            if observaciones is not None:
                contrato.observaciones_termino = observaciones

        elif nuevo_estado == "anulado":
            motivo_anulacion = kwargs.get("motivo_anulacion", "").strip()
            if not motivo_anulacion:
                raise ValidationError({
                    "motivo_anulacion": "Requerido al anular un contrato"
                })

            contrato.motivo_anulacion = motivo_anulacion

        # Validación 3: un solo contrato vigente por trabajador
        if nuevo_estado == "vigente" and contrato.usuario_empresa_id:
            accion = kwargs.get("accion")
            conflicto = ContratoTrabajador.objects.filter(
                usuario_empresa_id=contrato.usuario_empresa_id,
                estado="vigente",
            ).exclude(pk=contrato.pk).first()
            if conflicto:
                if accion != "deprecar_anterior":
                    raise ConflictoVigenteError(
                        contrato_vigente_id=conflicto.pk,
                        referencia=conflicto.referencia_interna or f"Contrato #{conflicto.pk}",
                    )
                conflicto.estado = "terminado"
                conflicto.motivo_termino = "otro"
                conflicto.fecha_termino_real = timezone.now().date()
                conflicto.save(update_fields=["estado", "motivo_termino", "fecha_termino_real", "fecha_modificacion"])

        # Cambio de estado
        contrato.estado = nuevo_estado
        if usuario:
            contrato._change_reason = f"Cambio de estado a {nuevo_estado} por {usuario.id}"

        # Usar update_fields para no sobrescribir campos no relacionados con el cambio
        update_fields = ["estado", "fecha_modificacion"]
        if nuevo_estado == "terminado":
            update_fields += ["motivo_termino", "fecha_termino_real"]
            if contrato.observaciones_termino is not None:
                update_fields.append("observaciones_termino")
        elif nuevo_estado == "anulado":
            update_fields.append("motivo_anulacion")

        contrato.save(update_fields=update_fields)

        # Sync UsuarioEmpresa según nuevo estado
        if contrato.usuario_empresa_id:
            ue = contrato.usuario_empresa

            if nuevo_estado == "vigente":
                ue_updates = ["estado", "fecha_modificacion"]
                ue.estado = "1"
                if contrato.cargo:
                    ue.cargo = contrato.cargo
                    ue_updates.append("cargo")
                if contrato.fecha_inicio and not ue.fecha_contrato:
                    ue.fecha_contrato = contrato.fecha_inicio
                    ue_updates.append("fecha_contrato")
                ue.save(update_fields=ue_updates)
                user = ue.usuario
                if not user.is_active:
                    user.is_active = True
                    user.save(update_fields=["is_active"])

            elif nuevo_estado in ("terminado", "anulado"):
                tiene_vigente = ue.contratos_laborales.filter(
                    estado__in=["vigente", "vencido"]
                ).exclude(pk=contrato.pk).exists()
                if not tiene_vigente:
                    ue.estado = "2"
                    ue.save(update_fields=["estado", "fecha_modificacion"])

            elif nuevo_estado == "descartado":
                if ue.estado == "3":
                    tiene_otros = ue.contratos_laborales.exclude(pk=contrato.pk).exists()
                    if not tiene_otros:
                        user = ue.usuario
                        ue.delete()
                        user.delete()

        logger.info(
            f"Contrato {contrato_id} cambió a estado {nuevo_estado}",
            extra={"contrato_id": contrato_id, "nuevo_estado": nuevo_estado}
        )

        return contrato

    @staticmethod
    @transaction.atomic
    def enviar_a_aprobacion_empleador(
        contrato_id: int,
        email_empleador: str,
        usuario
    ) -> EnvioAprobacionEmpleador:
        """
        Envía contrato al empleador para aprobación.

        Operación ATÓMICA:
        1. Obtiene contrato con lock
        2. Valida estado = borrador o pendiente_aprobacion
        3. Genera PDF congelado
        4. Crea EnvioAprobacionEmpleador
        5. Actualiza estado contrato
        6. Envía email async (on_commit)

        Args:
            contrato_id: ID del contrato a enviar
            email_empleador: Email destino de aprobación
            usuario: Usuario que ejecuta

        Returns:
            EnvioAprobacionEmpleador creado

        Raises:
            ValidationError: Si estado no es borrador ni pendiente_aprobacion
            PlantillaNoDisponibleError: Si no hay plantilla para generar PDF

        Example:
            >>> envio = RRHHContratosService.enviar_a_aprobacion_empleador(
            ...     contrato_id=123,
            ...     email_empleador="gerente@empresa.com",
            ...     usuario=request.user
            ... )
            >>> print(envio.uuid)  # Link único para empleador
        """
        # Lock
        contrato = ContratoTrabajador.objects.select_for_update().get(
            pk=contrato_id
        )

        # Validación: se permite primer envío desde borrador y reenvío/corrección desde pendiente_aprobacion
        if contrato.estado not in ("borrador", "pendiente_aprobacion"):
            raise ValidationError({
                "estado": f"Solo contratos en 'borrador' o 'pendiente_aprobacion' pueden enviarse. "
                          f"Este está en '{contrato.estado}'"
            })

        # Generar PDF (si no existe)
        try:
            if not contrato.archivo_pdf:
                _generar_pdf(contrato, persistir=True)

            # Leer PDF para congelar (snapshot)
            pdf_bytes = contrato.archivo_pdf.read()
        except PlantillaNoDisponibleError as e:
            raise ValidationError({
                "plantilla": f"No hay plantilla disponible: {str(e)}"
            })
        except Exception as e:
            logger.error(
                f"Error generando PDF para contrato {contrato_id}: {str(e)}"
            )
            raise ValidationError({
                "pdf": "Error al generar PDF. Intenta nuevamente."
            })

        # Expirar envíos anteriores
        contrato.envios_aprobacion_empleador.filter(expirado=False).update(
            expirado=True
        )

        # Crear envío
        envio = EnvioAprobacionEmpleador.objects.create(
            contrato=contrato,
            pdf_congelado=pdf_bytes,
            enviado_a=email_empleador,
            enviado_por=usuario
        )

        # Cambio de estado
        contrato.estado = "pendiente_aprobacion"
        contrato.snapshot_documento = RRHHContratosService._build_snapshot_documento(contrato)
        contrato._change_reason = (
            f"Enviado a aprobación a {email_empleador} por {usuario.id}"
        )
        contrato.save(update_fields=["estado", "snapshot_documento", "fecha_modificacion"])

        # Email async (on_commit para garantizar transacción)
        transaction.on_commit(
            lambda: _enviar_email_aprobacion_async(envio.id)
        )

        logger.info(
            f"Contrato {contrato_id} enviado a aprobación a {email_empleador}",
            extra={
                "contrato_id": contrato_id,
                "email": email_empleador,
                "envio_id": envio.id
            }
        )

        return envio

    @staticmethod
    @transaction.atomic
    def crear_anexo(
        contrato_id: int,
        tipo: str,
        fecha_efectiva,
        descripcion: str,
        usuario,
        **kwargs
    ) -> AnexoContrato:
        """
        Crea anexo (modificación) de contrato vigente.

        Operación ATÓMICA:
        1. Lock contrato
        2. Valida estado = vigente
        3. Crea anexo
        4. Si prórroga: actualiza fecha_termino del contrato
        5. Rollback si algo falla

        Args:
            contrato_id: ID del contrato
            tipo: Tipo anexo (modificacion_sueldo, prórroga, etc.)
            fecha_efectiva: Cuándo entra en vigor
            descripcion: Detalle del cambio
            usuario: Usuario que ejecuta
            **kwargs: nueva_fecha_termino (si es prórroga)

        Returns:
            AnexoContrato creado

        Raises:
            ValidationError: Si contrato no está vigente

        Example:
            >>> anexo = RRHHContratosService.crear_anexo(
            ...     contrato_id=123,
            ...     tipo="modificacion_sueldo",
            ...     fecha_efectiva="2025-06-01",
            ...     descripcion="Aumento de sueldo",
            ...     usuario=request.user
            ... )
        """
        # Lock
        contrato = ContratoTrabajador.objects.select_for_update().get(
            pk=contrato_id
        )

        # Validación: solo vigente
        if contrato.estado != "vigente":
            raise ValidationError({
                "estado": f"Anexos solo en contratos vigente. "
                          f"Este está en '{contrato.estado}'"
            })

        # Crear anexo
        anexo = AnexoContrato.objects.create(
            contrato=contrato,
            tipo=tipo,
            fecha_efectiva=fecha_efectiva,
            descripcion=descripcion,
            creado_por=usuario
        )

        # Si prórroga: actualizar fecha_termino contrato
        if tipo == "prorroga" and kwargs.get("nueva_fecha_termino"):
            contrato.fecha_termino = kwargs["nueva_fecha_termino"]
            contrato.save(update_fields=["fecha_termino", "fecha_modificacion"])

        logger.info(
            f"Anexo {anexo.id} creado para contrato {contrato_id}",
            extra={"anexo_id": anexo.id, "contrato_id": contrato_id}
        )

        return anexo


def _enviar_email_aprobacion_async(envio_id: int) -> None:
    """
    Envía email de aprobación al empleador (ejecutado por Celery via on_commit).

    Esta función se ejecuta DESPUÉS de que la transacción se confirme en BD.
    Si falla, no afecta la transacción.
    """
    try:
        envio = EnvioAprobacionEmpleador.objects.get(id=envio_id)
        contrato = envio.contrato

        trabajador_nombre = (
            contrato.usuario_empresa.usuario.get_nombre_completo()
            if contrato.usuario_empresa and contrato.usuario_empresa.usuario_id
            else "el trabajador"
        )

        from django.conf import settings
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        link_aprobacion = f"{frontend_url}/rrhh/aprobacion-empleador/{envio.uuid}/"

        html_body = (
            f"<p>Se le solicita revisar y aprobar el contrato laboral de "
            f"<strong>{trabajador_nombre}</strong>.</p>"
            f"<p>Cargo: {contrato.cargo or '-'}</p>"
            f"<p>Tipo: {contrato.get_tipo_contrato_display()}</p>"
            f"<p>Fecha inicio: {contrato.fecha_inicio}</p>"
            f"<p><strong>El contrato expira en 14 días.</strong></p>"
        )

        send_email_task.delay(
            subject="Solicitud de aprobación de contrato laboral",
            recipient_list=[envio.enviado_a],
            html_body=html_body,
            titulo="Revisión de Contrato Laboral",
            url_boton=link_aprobacion,
            text_boton="Revisar contrato",
        )

        logger.info(f"Email de aprobación enviado a {envio.enviado_a}")
    except Exception as e:
        logger.error(f"Error enviando email de aprobación: {str(e)}")


# ---------------------------------------------------------------------------
# Servicio de Finiquito
# ---------------------------------------------------------------------------

# Transiciones permitidas en el flujo de finiquito
_TRANSICIONES_FINIQUITO = {
    "borrador":   ["calculado", "firmado"],   # firmado: aprobación manual directa
    "calculado":  ["firmado"],
    "firmado":    ["pagado"],
    "pagado":     [],
}


class FiniquitoService:
    """Servicio centralizado para operaciones sobre finiquitos laborales."""

    @staticmethod
    @transaction.atomic
    def calcular_y_crear(
        contrato_id: int,
        usuario,
        dias_vacaciones_tomados: int = 0,
        aviso_previo_30_dias: bool = True,
    ) -> "FiniquitoContrato":
        """
        Crea el FiniquitoContrato calculando conceptos base automáticamente.

        Solo aplica a contratos en estado 'terminado'.
        Los conceptos son un punto de partida — el usuario puede ajustarlos.

        Args:
            dias_vacaciones_tomados: Días de vacaciones ya utilizados (descuenta de proporcional).
            aviso_previo_30_dias: Si False y la causal lo contempla, agrega concepto de
                                  indemnización sustitutiva del aviso previo (Art. 162 CT).
        """
        from math import floor
        from decimal import Decimal
        from .models import FiniquitoContrato

        contrato = ContratoTrabajador.objects.select_for_update().get(pk=contrato_id)

        if contrato.estado != "terminado":
            raise ValidationError(
                f"Solo contratos en estado 'terminado' pueden tener finiquito. "
                f"Este contrato está en '{contrato.get_estado_display()}'."
            )

        if FiniquitoContrato.objects.filter(contrato=contrato).exists():
            raise ValidationError("Este contrato ya tiene un finiquito registrado.")

        fecha_termino = contrato.fecha_termino_real or contrato.fecha_termino
        fecha_inicio = contrato.fecha_inicio

        if not fecha_termino or not fecha_inicio:
            raise ValidationError(
                "El contrato no tiene fecha de inicio o de término registrada."
            )

        # Remuneración íntegra mensual (Art. 71 CT) = sueldo + bonos fijos
        sueldo = (
            (contrato.sueldo or Decimal("0"))
            + (contrato.bono_movilizacion or Decimal("0"))
            + (contrato.bono_colacion or Decimal("0"))
        )

        dias_corridos = (fecha_termino - fecha_inicio).days
        años_servicio = dias_corridos / 365
        conceptos = []

        # — Sueldo proporcional del mes de término —
        dias_mes = fecha_termino.day
        monto_proporcional = (sueldo / Decimal("30")) * Decimal(dias_mes)
        conceptos.append({
            "id": "sueldo_proporcional",
            "nombre": "Sueldo proporcional",
            "detalle": f"{dias_mes} días trabajados en {fecha_termino.strftime('%B %Y')}",
            "monto": float(round(monto_proporcional, 0)),
        })

        # — Vacaciones proporcionales (días hábiles, aprox. 261/365) —
        # Fórmula: días_corridos × (261/365) × (15/261) = días_corridos × (15/365)
        dias_habiles_acumulados = round(dias_corridos * 15 / 365)
        dias_vac_netos = max(0, dias_habiles_acumulados - int(dias_vacaciones_tomados))
        if dias_vac_netos > 0:
            # Valor día hábil = sueldo / 30 (convención CT)
            monto_vacaciones = (sueldo / Decimal("30")) * Decimal(dias_vac_netos)
            detalle_vac = f"{dias_vac_netos} días hábiles"
            if dias_vacaciones_tomados > 0:
                detalle_vac += f" (acumulados {dias_habiles_acumulados} – tomados {dias_vacaciones_tomados})"
            conceptos.append({
                "id": "vacaciones_proporcionales",
                "nombre": "Vacaciones proporcionales",
                "detalle": detalle_vac,
                "monto": float(round(monto_vacaciones, 0)),
            })

        # — Gratificación proporcional (Art. 47) —
        if contrato.tipo_gratificacion == "art_47":
            meses_trabajados = min(12, round(dias_corridos / 30.4))
            monto_grat = min(
                sueldo * Decimal(meses_trabajados) / Decimal("12"),
                sueldo * Decimal("4.75") / Decimal("12"),
            )
            if monto_grat > 0:
                conceptos.append({
                    "id": "gratificacion_proporcional",
                    "nombre": "Gratificación proporcional (Art. 47 CT)",
                    "detalle": f"{meses_trabajados} meses trabajados",
                    "monto": float(round(monto_grat, 0)),
                })

        # — Indemnización por años de servicio (solo causales Art. 161) —
        if contrato.motivo_termino in CAUSALES_CON_INDEMNIZACION:
            # Tope 90 UF (Art. 163 CT)
            try:
                from contratos.currency_utils import obtener_tipos_cambio_actuales
                _, uf = obtener_tipos_cambio_actuales()
                tope_mensual = Decimal("90") * (uf or Decimal("35000"))
                sueldo_indemnizacion = min(sueldo, tope_mensual)
            except Exception:
                sueldo_indemnizacion = sueldo

            anos_completos = floor(años_servicio)
            if anos_completos >= 1:
                meses_max = min(anos_completos, 11)
                monto_indemnizacion = sueldo_indemnizacion * Decimal(meses_max)
                conceptos.append({
                    "id": "indemnizacion_anos_servicio",
                    "nombre": "Indemnización por años de servicio (Art. 163 CT)",
                    "detalle": f"{anos_completos} año(s) → {meses_max} mes(es) (máx. 11, tope 90 UF)",
                    "monto": float(round(monto_indemnizacion, 0)),
                })

                # — Recargo por despido injustificado (Art. 168 CT — mínimo 30%) —
                if contrato.motivo_termino in CAUSALES_CON_RECARGO:
                    recargo = round(monto_indemnizacion * Decimal("0.30"), 0)
                    conceptos.append({
                        "id": "recargo_despido_injustificado",
                        "nombre": "Recargo despido injustificado (Art. 168 CT — 30%)",
                        "detalle": "30% adicional sobre la indemnización. Ajustable si el tribunal fijó un porcentaje mayor.",
                        "monto": float(recargo),
                    })

            # — Indemnización sustitutiva del aviso previo (Art. 162 CT) —
            if contrato.motivo_termino in CAUSALES_CON_AVISO_PREVIO and not aviso_previo_30_dias:
                conceptos.append({
                    "id": "aviso_previo",
                    "nombre": "Indemnización sustitutiva del aviso previo (Art. 162 CT)",
                    "detalle": "El empleador no avisó con 30 días de anticipación",
                    "monto": float(round(sueldo, 0)),
                })

        total_bruto = Decimal(sum(c["monto"] for c in conceptos))

        finiquito = FiniquitoContrato.objects.create(
            contrato=contrato,
            conceptos=conceptos,
            total_bruto=total_bruto,
            total_descuentos=Decimal("0"),
            total_neto=total_bruto,
            estado="borrador",
            calculado_por=usuario,
        )

        logger.info(
            f"Finiquito {finiquito.id} creado para contrato {contrato_id}",
            extra={"finiquito_id": finiquito.id, "contrato_id": contrato_id},
        )
        return finiquito

    @staticmethod
    @transaction.atomic
    def actualizar_conceptos(finiquito_id: int, conceptos: list, usuario) -> "FiniquitoContrato":
        """Reemplaza los conceptos y recalcula totales. Solo en estado 'borrador'."""
        from decimal import Decimal
        from .models import FiniquitoContrato

        finiquito = FiniquitoContrato.objects.select_for_update().get(pk=finiquito_id)

        if finiquito.estado != "borrador":
            raise ValidationError(
                "Solo se pueden editar los conceptos de un finiquito en estado 'borrador'."
            )

        total_bruto = Decimal(sum(float(c.get("monto", 0)) for c in conceptos))
        finiquito.conceptos = conceptos
        finiquito.total_bruto = total_bruto
        finiquito.total_neto = total_bruto - finiquito.total_descuentos
        finiquito.save(update_fields=[
            "conceptos", "total_bruto", "total_neto", "fecha_modificacion"
        ])
        return finiquito

    @staticmethod
    @transaction.atomic
    def avanzar_estado(finiquito_id: int, nuevo_estado: str, usuario, **kwargs) -> "FiniquitoContrato":
        """Avanza el estado del finiquito según las transiciones permitidas."""
        from .models import FiniquitoContrato

        finiquito = FiniquitoContrato.objects.select_for_update().get(pk=finiquito_id)
        estados_posibles = _TRANSICIONES_FINIQUITO.get(finiquito.estado, [])

        if nuevo_estado not in estados_posibles:
            raise ValidationError(
                f"No se puede pasar de '{finiquito.estado}' a '{nuevo_estado}'. "
                f"Transiciones válidas: {estados_posibles or 'ninguna (estado terminal)'}."
            )

        finiquito.estado = nuevo_estado

        if nuevo_estado == "firmado" and kwargs.get("fecha_firma"):
            finiquito.fecha_firma = kwargs["fecha_firma"]

        update_fields = ["estado", "fecha_modificacion"]
        if nuevo_estado == "firmado" and finiquito.fecha_firma:
            update_fields.append("fecha_firma")

        finiquito.save(update_fields=update_fields)

        logger.info(
            f"Finiquito {finiquito_id} avanzó a '{nuevo_estado}'",
            extra={"finiquito_id": finiquito_id, "nuevo_estado": nuevo_estado},
        )
        return finiquito
        # NO re-raise: no queremos que afecte otros procesos