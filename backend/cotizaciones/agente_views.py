"""
Endpoint agente-facing: creación completa y atómica de cotizaciones.

Diseñado para ser consumido por un agente (MCP) mediante un token DRF
(API key de larga duración) asociado a un usuario de servicio.

Garantías que ofrece este endpoint (y que la ruta CRUD estándar NO ofrece):
  1. Multi-tenancy forzado: la empresa emisora se deriva del usuario del token,
     nunca del payload. El cliente debe estar relacionado con esa empresa.
  2. Atomicidad: cabecera + ítems se crean dentro de una transacción.
  3. Tipo de cambio síncrono: si la moneda (de la cotización o de algún ítem)
     es USD/UF, se resuelve el indicador antes de crear los ítems para que la
     validación de moneda pase sin depender del task asíncrono de Celery.
  4. Sin efectos externos: NO envía correos. La cotización queda en estado
     'pendiente' para revisión/envío humano.
"""
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.models import PersonalizacionUsuario
from empresas.models import Empresa, RelacionEmpresa, UsuarioEmpresa
from items.models import ItemEmpresa, ProveedorEmpresa

from .agente_serializers import CrearCotizacionCompletaSerializer
from .functions import crear_seguimiento_cotizacion
from .models import Cotizacion, ItemCotizacion
from .tasks import obtener_tipo_cambio_mindicador_con_fallback

logger = logging.getLogger(__name__)


def _empresa_del_usuario(user):
    """Empresa emisora del usuario de servicio (multi-tenancy)."""
    perso = (
        PersonalizacionUsuario.objects.filter(usuario=user)
        .select_related("sucursal_principal__empresa")
        .first()
    )
    if not perso or not perso.sucursal_principal:
        return None
    return perso.sucursal_principal.empresa


class CrearCotizacionCompletaView(APIView):
    """POST /api/cotizaciones/crear-completa/"""

    authentication_classes = [TokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CrearCotizacionCompletaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # --- Identidad y tenancy ---
        empresa = _empresa_del_usuario(request.user)
        if not empresa:
            return Response(
                {"detail": "El usuario del token no tiene empresa principal configurada."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=request.user)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"detail": "El usuario del token no tiene UsuarioEmpresa asociado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Cliente ---
        try:
            cliente = Empresa.objects.get(pk=data["cliente"])
        except Empresa.DoesNotExist:
            return Response(
                {"detail": "Cliente no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not RelacionEmpresa.objects.filter(
            prestador_servicios=empresa, cliente=cliente
        ).exists():
            return Response(
                {"detail": f"El cliente '{cliente.nombre}' no está relacionado con tu empresa."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tipo_moneda = data.get("tipo_moneda", "2")
        items_data = data["items"]

        # --- Resolver referencias de ítems (tenancy) ANTES de la transacción ---
        items_resueltos = []
        for idx, it in enumerate(items_data):
            item_empresa = None
            proveedor_empresa = None
            if it.get("item_empresa"):
                item_empresa = ItemEmpresa.objects.filter(
                    pk=it["item_empresa"], empresa=empresa
                ).first()
                if not item_empresa:
                    return Response(
                        {"detail": f"Ítem #{idx}: item_empresa {it['item_empresa']} no existe o no pertenece a tu empresa."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if it.get("proveedor_empresa"):
                proveedor_empresa = ProveedorEmpresa.objects.filter(
                    pk=it["proveedor_empresa"], empresa=empresa
                ).first()
                if not proveedor_empresa:
                    return Response(
                        {"detail": f"Ítem #{idx}: proveedor_empresa {it['proveedor_empresa']} no existe o no pertenece a tu empresa."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            items_resueltos.append((it, item_empresa, proveedor_empresa))

        # --- Tipo de cambio síncrono (si aplica) ---
        monedas = {tipo_moneda} | {
            it.get("tipo_moneda") for it in items_data if it.get("tipo_moneda")
        }
        requiere_dolar = "1" in monedas
        requiere_uf = "3" in monedas
        fecha_fact = data.get("fecha_facturacion") or timezone.localdate()

        dolar_observado = data.get("dolar_observado")
        valor_uf = data.get("valor_uf")
        es_manual = bool(dolar_observado or valor_uf)

        try:
            if requiere_dolar and not dolar_observado:
                dolar_observado, _ = obtener_tipo_cambio_mindicador_con_fallback(
                    "dolar", fecha_fact
                )
            if requiere_uf and not valor_uf:
                valor_uf, _ = obtener_tipo_cambio_mindicador_con_fallback(
                    "uf", fecha_fact
                )
        except Exception as e:  # noqa: BLE001
            logger.error("[agente] Error resolviendo tipo de cambio: %s", e)
            return Response(
                {
                    "detail": "No se pudo obtener el tipo de cambio requerido. "
                    "Envíe 'dolar_observado' o 'valor_uf' manualmente.",
                    "error": str(e),
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        tiene_tc = bool(dolar_observado or valor_uf)
        estado_tc = "manual" if es_manual else ("actualizado" if tiene_tc else "pendiente")

        # --- Creación atómica ---
        try:
            with transaction.atomic():
                cotizacion = Cotizacion.objects.create(
                    nombre=data["nombre"],
                    empresa=empresa,
                    cliente=cliente,
                    tipo_moneda=tipo_moneda,
                    observaciones=data.get("observaciones"),
                    fecha_facturacion=fecha_fact,
                    # Prefill desde el cliente (mismo comportamiento que perform_create)
                    ppm=cliente.ppm,
                    porcentaje_recargo=cliente.recargo,
                    dolar_observado=dolar_observado,
                    valor_uf=valor_uf,
                    fecha_tipo_cambio=fecha_fact if tiene_tc else None,
                    estado_tipo_cambio=estado_tc,
                    estado="pendiente",
                )

                for it, item_empresa, proveedor_empresa in items_resueltos:
                    ItemCotizacion.objects.create(
                        cotizacion=cotizacion,
                        nombre=it.get("nombre"),
                        descripcion=it.get("descripcion"),
                        cantidad=it["cantidad"],
                        precio_unitario=it["precio_unitario"],
                        tipo_moneda=it.get("tipo_moneda") or tipo_moneda,
                        item_empresa=item_empresa,
                        proveedor_empresa=proveedor_empresa,
                        porcentaje_recargo=it.get("porcentaje_recargo") or 0,
                    )

                crear_seguimiento_cotizacion(
                    cotizacion_id=cotizacion.id,
                    usuario_id=usuario_empresa.id,
                    comentario=(
                        f"Cotización {cotizacion.numero_cotizacion} creada vía agente (API)."
                    ),
                )
        except Exception as e:  # noqa: BLE001
            logger.exception("[agente] Error creando cotización completa")
            return Response(
                {"detail": "Error creando la cotización.", "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": cotizacion.id,
                "numero_cotizacion": cotizacion.numero_cotizacion,
                "estado": cotizacion.estado,
                "tipo_moneda": cotizacion.tipo_moneda,
                "total_estimado": str(cotizacion.calcular_total_estimado),
                "items_creados": len(items_resueltos),
                "detail": (
                    "Cotización creada en estado 'pendiente'. "
                    "Revísala y envíala manualmente desde el ERP."
                ),
            },
            status=status.HTTP_201_CREATED,
        )
