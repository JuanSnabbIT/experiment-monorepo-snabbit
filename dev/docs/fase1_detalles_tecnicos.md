# 🔧 FASE 1: DETALLES TÉCNICOS - Backend Atómico

**Objetivo:** Garantizar atomicidad en operaciones críticas  
**Timeline:** 5 días  
**Archivos a modificar:** 3 principales + 1 nuevo  
**Tests:** 12+ casos nuevos

---

## 📋 DESCRIPCIÓN GENERAL

La Fase 1 refactoriza la lógica de negocio del módulo RRHH para garantizar que todas las operaciones críticas sean atómicas. Esto previene estados inconsistentes en la base de datos.

**Cambios:**
1. Crear `RRHHContratosService` (nuevo archivo)
2. Refactorizar `ContratoTrabajadorViewSet` (delegar a service)
3. Agregar `@transaction.atomic` en puntos críticos
4. Implementar `select_for_update()` para locking
5. Escribir tests exhaustivos

---

## 📁 ARCHIVOS A MODIFICAR

```
backend/rrhh/
├─ services.py              (NUEVO - 200+ líneas)
├─ views.py                 (MODIFICAR - refactor 150 líneas)
├─ tests/test_atomicity.py  (NUEVO - 300+ líneas)
└─ tests/test_views.py      (ACTUALIZAR - agregar 50 líneas)
```

---

## 1️⃣ CREAR `backend/rrhh/services.py`

**Archivo NUEVO: Backend service layer**

```python
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
from .estados_modelo import TRANSICIONES_CONTRATO, MOTIVO_TERMINO_CONTRATO
from empresas.models import UsuarioEmpresa, SucursalEmpresa
from core.tasks import send_email_task
from contratos.servicio_pdf import generar_pdf as _generar_pdf, PlantillaNoDisponibleError

logger = logging.getLogger(__name__)


class RRHHContratosServiceException(Exception):
    """Excepción base para errores del servicio"""
    pass


class RRHHContratosService:
    """
    Servicio centralizado para operaciones sobre contratos laborales.
    
    Todos los métodos son transaccionales y thread-safe.
    """
    
    # =====================================================================
    # OPERACIONES CRÍTICAS (ATÓMICAS)
    # =====================================================================
    
    @staticmethod
    @transaction.atomic
    def cambiar_estado_a_vigente(contrato_id: int, usuario) -> ContratoTrabajador:
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
        
        # Validación 2: Aprobación del empleador
        envio = contrato.envios_aprobacion_empleador.filter(
            expirado=False
        ).order_by("-fecha_envio").first()
        
        if not envio:
            raise ValidationError({
                "aprobacion": "No hay envío de aprobación activo o vigente"
            })
        
        if envio.decision != "aprobado":
            raise ValidationError({
                "aprobacion": f"Empleador no aprobó. "
                              f"Estado: {envio.get_decision_display()}"
            })
        
        # Transición atómica
        contrato.estado = "vigente"
        contrato.fecha_aprobacion = timezone.now()
        contrato.aceptado_por = usuario
        contrato.save(update_fields=[
            "estado",
            "fecha_aprobacion",
            "aceptado_por",
            "fecha_modificacion"
        ])
        
        # Sync UsuarioEmpresa (crítico)
        if contrato.usuario_empresa:
            ue = contrato.usuario_empresa
            ue_updates = []
            
            if contrato.cargo:
                ue.cargo = contrato.cargo
                ue_updates.append("cargo")
            
            if contrato.fecha_inicio and not ue.fecha_contrato:
                ue.fecha_contrato = contrato.fecha_inicio
                ue_updates.append("fecha_contrato")
            
            if ue_updates:
                ue_updates.append("fecha_modificacion")
                ue.save(update_fields=ue_updates)
        
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
        
        # Cambio de estado (atómico)
        contrato.estado = nuevo_estado
        if usuario:
            contrato._change_reason = f"Cambio de estado a {nuevo_estado} por {usuario.id}"
        
        contrato.save()
        
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
        2. Valida estado = borrador
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
            ValidationError: Si estado no es borrador
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
        
        # Validación: solo borrador
        if contrato.estado != "borrador":
            raise ValidationError({
                "estado": f"Solo contratos en 'borrador' pueden enviarse. "
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
        contrato._change_reason = (
            f"Enviado a aprobación a {email_empleador} por {usuario.id}"
        )
        contrato.save(update_fields=["estado", "fecha_modificacion"])
        
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
            f"<p><a href='{link_aprobacion}'>Revisar y responder</a></p>"
        )
        
        send_email_task.delay(
            subject="Solicitud de aprobación de contrato laboral",
            recipients=[envio.enviado_a],
            html_body=html_body,
            template_name="Aprobacion de Contrato",
            action_url=link_aprobacion,
            action_text="Revisar contrato"
        )
        
        logger.info(f"Email de aprobación enviado a {envio.enviado_a}")
    except Exception as e:
        logger.error(f"Error enviando email de aprobación: {str(e)}")
        # NO re-raise: no queremos que afecte otros procesos
```

---

## 2️⃣ REFACTORIZAR `backend/rrhh/views.py`

**Cambios en ContratoTrabajadorViewSet para usar Service**

```python
# backend/rrhh/views.py (CAMBIOS)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from .models import ContratoTrabajador
from .serializers import ContratoTrabajadorSerializer
from .services import RRHHContratosService, RRHHContratosServiceException


class ContratoTrabajadorViewSet(viewsets.ModelViewSet):
    """ViewSet refactorizado - delega lógica al service"""
    
    queryset = ContratoTrabajador.objects.all()
    serializer_class = ContratoTrabajadorSerializer
    permission_classes = [IsAuthenticated]
    
    # ... métodos existentes ...
    
    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        """
        Cambiar estado del contrato.
        
        REFACTORIZADO: Usa RRHHContratosService.cambiar_estado()
        Garantiza atomicidad y validaciones consistentes.
        """
        try:
            contrato = RRHHContratosService.cambiar_estado(
                contrato_id=pk,
                nuevo_estado=request.data.get("estado"),
                usuario=request.user,
                **request.data
            )
            return Response(ContratoTrabajadorSerializer(contrato).data)
        
        except ValidationError as e:
            return Response(
                {"detail": str(e.message), "errors": e.message_dict},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error cambiando estado: {str(e)}")
            return Response(
                {"detail": "Error al cambiar estado. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["post"], url_path="aceptar")
    def aceptar(self, request, pk=None):
        """
        Acepta contrato después de aprobación empleador.
        
        REFACTORIZADO: Usa RRHHContratosService.cambiar_estado_a_vigente()
        Garantiza atomicidad de cambios relacionados.
        """
        try:
            contrato = RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=pk,
                usuario=request.user
            )
            
            # Notificaciones (on_commit)
            transaction.on_commit(
                lambda: _notificar_aceptacion(contrato, request.user)
            )
            
            return Response(ContratoTrabajadorSerializer(contrato).data)
        
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ContratoTrabajador.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error aceptando contrato: {str(e)}")
            return Response(
                {"detail": "Error al aceptar. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["post"], url_path="enviar-aprobacion-empleador")
    def enviar_aprobacion_empleador(self, request, pk=None):
        """
        Envía contrato al empleador para aprobación.
        
        REFACTORIZADO: Usa RRHHContratosService.enviar_a_aprobacion_empleador()
        Garantiza atomicidad: PDF + EnvioAprobacionEmpleador + cambio estado
        """
        email_empleador = request.data.get("email_empleador", "").strip()
        if not email_empleador:
            return Response(
                {"email_empleador": "Requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            envio = RRHHContratosService.enviar_a_aprobacion_empleador(
                contrato_id=pk,
                email_empleador=email_empleador,
                usuario=request.user
            )
            
            return Response({
                "contrato": ContratoTrabajadorSerializer(envio.contrato).data,
                "envio": EnvioAprobacionEmpleadorSerializer(envio).data
            })
        
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error enviando aprobación: {str(e)}")
            return Response(
                {"detail": "Error al enviar. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnexoContratoViewSet(viewsets.ModelViewSet):
    """REFACTORIZADO: Usa service para crear anexos"""
    
    @action(detail=False, methods=["post"])
    def crear_anexo(self, request):
        """Crear anexo - garantiza contrato vigente"""
        try:
            anexo = RRHHContratosService.crear_anexo(
                contrato_id=request.data.get("contrato_id"),
                tipo=request.data.get("tipo"),
                fecha_efectiva=request.data.get("fecha_efectiva"),
                descripcion=request.data.get("descripcion"),
                usuario=request.user,
                nueva_fecha_termino=request.data.get("nueva_fecha_termino")
            )
            
            return Response(
                AnexoContratoSerializer(anexo).data,
                status=status.HTTP_201_CREATED
            )
        
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
```

---

## 3️⃣ CREAR TESTS: `backend/rrhh/tests/test_atomicity.py`

**Tests exhaustivos para atomicidad**

```python
# backend/rrhh/tests/test_atomicity.py (NUEVO)

"""
Tests para garantizar atomicidad de operaciones críticas.

Valida que cambios múltiples se ejecuten juntos o no se ejecuten.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.db import transaction, IntegrityError
from django.utils import timezone
from unittest.mock import patch, MagicMock

from rrhh.models import ContratoTrabajador, EnvioAprobacionEmpleador
from rrhh.services import RRHHContratosService
from rrhh.exceptions import ValidationError
from empresas.models import UsuarioEmpresa, SucursalEmpresa, Empresa
from cuentas.models import User


class TestCambiarEstadoAVigenteAtomicity(TransactionTestCase):
    """Tests para cambiar_estado_a_vigente() - operación crítica"""
    
    def setUp(self):
        """Preparar datos de prueba"""
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina Central"
        )
        self.user_trabajador = User.objects.create_user(
            username="trabajador",
            email="trabajador@empresa.com"
        )
        self.ue = UsuarioEmpresa.objects.create(
            usuario=self.user_trabajador,
            sucursal=self.sucursal
        )
        self.user_rrhh = User.objects.create_user(
            username="rrhh",
            email="rrhh@empresa.com"
        )
        
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="pendiente_aprobacion",
            tipo_contrato="indefinido",
            fecha_inicio="2025-06-01",
            cargo="Ingeniero",
            jornada="completa"
        )
        
        # Crear envío aprobado
        self.envio = EnvioAprobacionEmpleador.objects.create(
            contrato=self.contrato,
            pdf_congelado=b"pdf_data",
            enviado_a="gerente@empresa.com",
            enviado_por=self.user_rrhh,
            decision="aprobado",
            fecha_respuesta=timezone.now()
        )
    
    def test_cambiar_a_vigente_exito(self):
        """Test: Cambiar a vigente EXITOSAMENTE actualiza contrato + UsuarioEmpresa"""
        contrato = RRHHContratosService.cambiar_estado_a_vigente(
            contrato_id=self.contrato.id,
            usuario=self.user_rrhh
        )
        
        # Validar contrato
        assert contrato.estado == "vigente"
        assert contrato.aceptado_por == self.user_rrhh
        assert contrato.fecha_aprobacion is not None
        
        # Validar sincronización UsuarioEmpresa
        self.ue.refresh_from_db()
        assert self.ue.cargo == "Ingeniero"
        assert self.ue.fecha_contrato == timezone.datetime(2025, 6, 1).date()
    
    def test_cambiar_a_vigente_rollback_si_ue_falla(self):
        """
        Test CRÍTICO: Si ue.save() falla, contrato DEBE volver a pendiente
        (Atomicidad garantizada por @transaction.atomic)
        """
        with patch.object(UsuarioEmpresa, 'save', side_effect=IntegrityError("DB Error")):
            with pytest.raises(IntegrityError):
                RRHHContratosService.cambiar_estado_a_vigente(
                    contrato_id=self.contrato.id,
                    usuario=self.user_rrhh
                )
        
        # Validar rollback: contrato sigue en pendiente
        self.contrato.refresh_from_db()
        assert self.contrato.estado == "pendiente_aprobacion"
        assert self.contrato.aceptado_por is None
    
    def test_cambiar_a_vigente_sin_aprobacion_falla(self):
        """Test: No cambia si empleador no aprobó"""
        # Cambiar decisión a rechazado
        self.envio.decision = "rechazado"
        self.envio.save()
        
        with pytest.raises(ValidationError) as exc:
            RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=self.contrato.id,
                usuario=self.user_rrhh
            )
        
        assert "Empleador no aprobó" in str(exc.value)
    
    def test_cambiar_a_vigente_estado_incorrecto_falla(self):
        """Test: No cambia si no está en pendiente_aprobacion"""
        self.contrato.estado = "borrador"
        self.contrato.save()
        
        with pytest.raises(ValidationError) as exc:
            RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=self.contrato.id,
                usuario=self.user_rrhh
            )
        
        assert "pendiente_aprobacion" in str(exc.value)


class TestCambiarEstadoAtomicity(TransactionTestCase):
    """Tests para cambiar_estado() - máquina de estados"""
    
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina"
        )
        self.user_rrhh = User.objects.create_user(username="rrhh")
        self.ue = UsuarioEmpresa.objects.create(
            usuario=User.objects.create_user(username="trab"),
            sucursal=self.sucursal
        )
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="vigente",
            tipo_contrato="indefinido",
            fecha_inicio="2025-01-01",
            cargo="Ingeniero"
        )
    
    def test_terminar_contrato_exito(self):
        """Test: Terminar vigente con motivo"""
        contrato = RRHHContratosService.cambiar_estado(
            contrato_id=self.contrato.id,
            nuevo_estado="terminado",
            motivo_termino="renuncia",
            fecha_termino_real="2025-06-01",
            usuario=self.user_rrhh
        )
        
        assert contrato.estado == "terminado"
        assert contrato.motivo_termino == "renuncia"
        assert contrato.fecha_termino_real.isoformat() == "2025-06-01"
    
    def test_terminar_sin_motivo_falla(self):
        """Test: motivo_termino es obligatorio"""
        with pytest.raises(ValidationError) as exc:
            RRHHContratosService.cambiar_estado(
                contrato_id=self.contrato.id,
                nuevo_estado="terminado",
                usuario=self.user_rrhh
                # motivo_termino: OMITIDO
            )
        
        assert "motivo_termino" in str(exc.value)
        
        # Validar que contrato no cambió
        self.contrato.refresh_from_db()
        assert self.contrato.estado == "vigente"
    
    def test_anular_contrato_exito(self):
        """Test: Anular vigente con motivo"""
        contrato = RRHHContratosService.cambiar_estado(
            contrato_id=self.contrato.id,
            nuevo_estado="anulado",
            motivo_anulacion="Mutuo acuerdo",
            usuario=self.user_rrhh
        )
        
        assert contrato.estado == "anulado"
        assert contrato.motivo_anulacion == "Mutuo acuerdo"
    
    def test_transicion_no_permitida_falla(self):
        """Test: Vigente no puede ir a borrador"""
        with pytest.raises(ValidationError) as exc:
            RRHHContratosService.cambiar_estado(
                contrato_id=self.contrato.id,
                nuevo_estado="borrador",  # No permitido desde vigente
                usuario=self.user_rrhh
            )
        
        assert "No se puede cambiar" in str(exc.value)


class TestEnviarAprobacionAtomicity(TransactionTestCase):
    """Tests para enviar_a_aprobacion_empleador()"""
    
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina"
        )
        self.user_rrhh = User.objects.create_user(username="rrhh")
        self.ue = UsuarioEmpresa.objects.create(
            usuario=User.objects.create_user(username="trab"),
            sucursal=self.sucursal
        )
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="borrador",
            tipo_contrato="indefinido",
            fecha_inicio="2025-06-01",
            cargo="Ingeniero",
            jornada="completa"
        )
    
    @patch('rrhh.services._enviar_email_aprobacion_async')
    @patch('rrhh.services._generar_pdf')
    def test_enviar_aprobacion_exito(self, mock_generar, mock_email):
        """Test: Envío crea EnvioAprobacionEmpleador + cambio estado + email"""
        mock_generar.return_value = b"pdf_data"
        
        envio = RRHHContratosService.enviar_a_aprobacion_empleador(
            contrato_id=self.contrato.id,
            email_empleador="gerente@empresa.com",
            usuario=self.user_rrhh
        )
        
        # Validar envío creado
        assert envio.enviado_a == "gerente@empresa.com"
        assert envio.decision == "pendiente"
        assert envio.pdf_congelado == b"pdf_data"
        
        # Validar contrato cambió estado
        self.contrato.refresh_from_db()
        assert self.contrato.estado == "pendiente_aprobacion"
        
        # Validar email scheduled
        mock_email.assert_called_once()
    
    def test_enviar_aprobacion_no_en_borrador_falla(self):
        """Test: Solo borrador puede enviarse"""
        self.contrato.estado = "vigente"
        self.contrato.save()
        
        with pytest.raises(ValidationError) as exc:
            RRHHContratosService.enviar_a_aprobacion_empleador(
                contrato_id=self.contrato.id,
                email_empleador="gerente@empresa.com",
                usuario=self.user_rrhh
            )
        
        assert "borrador" in str(exc.value)
    
    def test_enviar_aprobacion_rollback_si_falla(self):
        """Test CRÍTICO: Si email falla, EnvioAprobacionEmpleador se elimina"""
        with patch('rrhh.services._generar_pdf', side_effect=Exception("PDF Error")):
            with pytest.raises(Exception):
                RRHHContratosService.enviar_a_aprobacion_empleador(
                    contrato_id=self.contrato.id,
                    email_empleador="gerente@empresa.com",
                    usuario=self.user_rrhh
                )
        
        # Validar rollback: no hay envío creado
        assert not EnvioAprobacionEmpleador.objects.filter(
            contrato_id=self.contrato.id
        ).exists()
        
        # Contrato sigue en borrador
        self.contrato.refresh_from_db()
        assert self.contrato.estado == "borrador"
```

---

## 4️⃣ ACTUALIZAR TESTS EXISTENTES

**Agregar imports y fixtures en `test_views.py`**

```python
# backend/rrhh/tests/test_views.py (CAMBIOS MÍNIMOS)

# Agregar al inicio
import pytest
from django.test import TransactionTestCase
from unittest.mock import patch

# Agregar fixture compartida
@pytest.fixture
def setup_contrato_data(db):
    """Fixture: datos de prueba para tests"""
    empresa = Empresa.objects.create(nombre="Test Co")
    sucursal = SucursalEmpresa.objects.create(empresa=empresa, nombre="Oficina")
    user = User.objects.create_user(username="user")
    ue = UsuarioEmpresa.objects.create(usuario=user, sucursal=sucursal)
    
    return {
        "empresa": empresa,
        "sucursal": sucursal,
        "ue": ue,
        "user": user
    }

# Tests existentes se heredan y funciona mejor ahora que ViewSet delega a Service
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

```
FASE 1: BACKEND ATÓMICO (5 días)

Día 1: Crear Service Layer
  [ ] Crear backend/rrhh/services.py con RRHHContratosService
  [ ] Implementar cambiar_estado_a_vigente() - atómico
  [ ] Implementar cambiar_estado() - atómico
  [ ] Implementar enviar_a_aprobacion_empleador() - atómico
  [ ] Implementar crear_anexo() - atómico
  [ ] Validar select_for_update() + @transaction.atomic

Día 2: Refactorizar ViewSets
  [ ] Modificar ContratoTrabajadorViewSet para usar service
  [ ] Modificar AnexoContratoViewSet para usar service
  [ ] Actualizar errorHandling (validaciones)
  [ ] Remover lógica de vistas (mover a service)

Día 3: Tests de Atomicidad
  [ ] Crear backend/rrhh/tests/test_atomicity.py
  [ ] Tests para cambiar_estado_a_vigente()
  [ ] Tests para cambiar_estado()
  [ ] Tests para enviar_a_aprobacion()
  [ ] Tests para crear_anexo()

Día 4: Validar Migración
  [ ] No hay migrations (no cambios de modelos)
  [ ] Ejecutar tests: `pytest backend/rrhh/tests/test_atomicity.py -v`
  [ ] Validar todos los tests pasan
  [ ] Coverage check: meta 80%+

Día 5: QA + Documentación
  [ ] Documentar servicio (docstrings completos)
  [ ] Testing manual: crear contrato → enviar → aprobar → vigente
  [ ] Validar rollback en casos de error
  [ ] Preparar documentación para Fase 2
```

---

## 🧪 CÓMO EJECUTAR TESTS

```bash
# Tests de atomicidad solamente
pytest backend/rrhh/tests/test_atomicity.py -v

# Tests de todo el módulo
pytest backend/rrhh/tests/ -v

# Con coverage
pytest backend/rrhh/tests/ --cov=rrhh --cov-report=html

# Test específico
pytest backend/rrhh/tests/test_atomicity.py::TestCambiarEstadoAVigenteAtomicity::test_cambiar_a_vigente_rollback_si_ue_falla -v
```

---

## 📊 IMPACTO ESPERADO

```
ANTES (Atomicidad Parcial):
├─ cambiar_estado(): 2 operaciones no conectadas
├─ enviar_aprobacion(): 3 operaciones, si falla #2 → inconsistencia
├─ Riesgo: Estados inconsistentes = bugs difíciles de debuggear
└─ Difícil de testear

DESPUÉS (Atomicidad Total):
├─ Todas las operaciones atómicas con @transaction.atomic
├─ select_for_update() previene race conditions
├─ on_commit() para tasks async sin afectar transacción
├─ Rollback automático en error = garantía de consistencia
├─ Tests exhaustivos = confianza en cambios
└─ Fácil de mantener y extender
```

---

## 📝 PRÓXIMO PASO

Una vez completada la Fase 1, proceder con **Fase 2: Frontend AutoSave** (FRONTEND_AUTOSAVE_DETALLES_TECNICOS.md)

