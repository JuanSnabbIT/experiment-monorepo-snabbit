from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.permissions import requiere_roles
from .filters import *
from .models import *
from .serializers import *
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType


class PersonalizacionUsuarioViewSet(viewsets.ModelViewSet):
    queryset = PersonalizacionUsuario.objects.all()
    serializer_class = PersonalizacionUsuarioSerializer
    filterset_class = PersonalizacionUsuarioFilter

    def get_queryset(self):
        return PersonalizacionUsuario.objects.filter(usuario=self.request.user)

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Method 'POST' not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class IndicadorEconomicoViewSet(viewsets.ViewSet):
    """
    ViewSet para obtener indicadores económicos (Dólar, UF).
    Usa el sistema de cache con 4 niveles de fallback:
    1. BD (IndicadorEconomico) - Cache persistente
    2. Redis - Cache temporal 24h
    3. API Mindicador - Consulta externa
    4. Fallback histórico BD
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="ultimos")
    def ultimos(self, request):
        """
        Retorna los valores más recientes de dólar y UF.
        Usa el sistema de cache del backend en lugar de consultar directo a mindicador.cl
        
        Query params:
        - fecha: Fecha de referencia (default: hoy) formato YYYY-MM-DD
        """
        from datetime import date
        from decimal import Decimal
        from cotizaciones.tasks import obtener_tipo_cambio_mindicador_con_fallback
        
        fecha_str = request.query_params.get("fecha")
        
        if fecha_str:
            try:
                fecha_referencia = date.fromisoformat(fecha_str)
            except ValueError:
                fecha_referencia = date.today()
        else:
            fecha_referencia = date.today()
        
        resultado = {
            "fecha_consulta": fecha_referencia.isoformat(),
            "dolar": None,
            "uf": None,
            "errores": [],
        }
        
        # Obtener dólar
        try:
            valor_dolar, fecha_dolar = obtener_tipo_cambio_mindicador_con_fallback(
                "dolar", fecha_referencia
            )
            resultado["dolar"] = {
                "valor": float(valor_dolar),
                "fecha_referencia": fecha_dolar.isoformat(),
            }
        except ValueError as e:
            resultado["errores"].append(f"Dólar: {str(e)}")
        except Exception as e:
            resultado["errores"].append(f"Dólar: Error inesperado - {str(e)}")
        
        # Obtener UF
        try:
            valor_uf, fecha_uf = obtener_tipo_cambio_mindicador_con_fallback(
                "uf", fecha_referencia
            )
            resultado["uf"] = {
                "valor": float(valor_uf),
                "fecha_referencia": fecha_uf.isoformat(),
            }
        except ValueError as e:
            resultado["errores"].append(f"UF: {str(e)}")
        except Exception as e:
            resultado["errores"].append(f"UF: Error inesperado - {str(e)}")
        
        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="historico")
    def historico(self, request):
        """
        Retorna el historial de indicadores almacenados en BD.
        
        Query params:
        - tipo: 'dolar' o 'uf' (requerido)
        - dias: Cantidad de días hacia atrás (default: 30)
        """
        from datetime import date, timedelta
        
        tipo = request.query_params.get("tipo")
        if tipo not in ["dolar", "uf"]:
            return Response(
                {"detail": "Debe especificar tipo='dolar' o tipo='uf'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dias = int(request.query_params.get("dias", 30))
        except ValueError:
            dias = 30
        
        fecha_desde = date.today() - timedelta(days=dias)
        
        indicadores = IndicadorEconomico.objects.filter(
            tipo=tipo,
            fecha__gte=fecha_desde
        ).order_by("-fecha").values("fecha", "valor", "fuente")
        
        return Response({
            "tipo": tipo,
            "dias": dias,
            "valores": [
                {
                    "fecha": i["fecha"].isoformat(),
                    "valor": float(i["valor"]),
                    "fuente": i["fuente"],
                }
                for i in indicadores
            ]
        })


class ContentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ContentType.objects.all()
    serializer_class = ContentTypeSerializer


class ActividadRecienteViewSet(viewsets.ViewSet):
    """
    ViewSet para obtener actividad reciente del dashboard.
    Consolida eventos de OT, Cotizaciones, Rendiciones, etc.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="lista")
    def lista(self, request):
        """
        Retorna actividad reciente de la empresa del usuario.
        
        Query params:
        - limite: Cantidad máxima de eventos (default: 10)
        """
        from datetime import datetime, timedelta
        from django.db.models import Q
        from ordentrabajov2.models import OrdenDeTrabajo
        from cotizaciones.models import Cotizacion
        from rendiciones.models import Rendicion
        
        try:
            limite = int(request.query_params.get("limite", 10))
            limite = min(limite, 50)  # Máximo 50
        except ValueError:
            limite = 10
        
        # Obtener empresa del usuario
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=request.user
        ).select_related('sucursal_principal__empresa').first()
        
        if not personalizacion or not personalizacion.sucursal_principal:
            return Response({"actividades": [], "total": 0})
        
        empresa_id = personalizacion.sucursal_principal.empresa.id
        fecha_limite = datetime.now() - timedelta(days=30)
        
        actividades = []
        
        # OTs recientes (creadas o completadas)
        try:
            ots = OrdenDeTrabajo.objects.filter(
                empresa_id=empresa_id,
                created_at__gte=fecha_limite
            ).select_related('cliente').order_by('-created_at')[:limite]
            
            for ot in ots:
                actividades.append({
                    "id": ot.id,
                    "tipo": "ot",
                    "titulo": f"OT #{ot.id} - {ot.titulo[:30]}..." if len(ot.titulo) > 30 else f"OT #{ot.id} - {ot.titulo}",
                    "subtitulo": ot.cliente.razon_social if ot.cliente else "Sin cliente",
                    "estado": ot.estado,
                    "fecha": ot.created_at.isoformat(),
                    "icono": "HeroWrenchScrewdriver",
                    "color": "blue",
                })
        except Exception:
            pass
        
        # Cotizaciones recientes
        try:
            cotizaciones = Cotizacion.objects.filter(
                empresa_id=empresa_id,
                created_at__gte=fecha_limite
            ).select_related('cliente').order_by('-created_at')[:limite]
            
            for cot in cotizaciones:
                estado_display = {
                    'pendiente': 'Pendiente',
                    'enviada': 'Enviada',
                    'aceptada': 'Aceptada',
                    'rechazada': 'Rechazada',
                    'expirada': 'Expirada',
                }.get(cot.estado, cot.estado)
                
                actividades.append({
                    "id": cot.id,
                    "tipo": "cotizacion",
                    "titulo": f"Cotización #{cot.numero_cotizacion}",
                    "subtitulo": cot.cliente.razon_social if cot.cliente else "Sin cliente",
                    "estado": cot.estado,
                    "estado_display": estado_display,
                    "fecha": cot.created_at.isoformat(),
                    "icono": "HeroDocumentText",
                    "color": "emerald" if cot.estado == 'aceptada' else "amber" if cot.estado in ['pendiente', 'enviada'] else "zinc",
                })
        except Exception:
            pass
        
        # Rendiciones recientes
        try:
            rendiciones = Rendicion.objects.filter(
                empresa_id=empresa_id,
                fecha_compra__gte=fecha_limite.date()
            ).select_related('usuario', 'cliente').order_by('-fecha_compra')[:limite]
            
            for rend in rendiciones:
                nombre_usuario = f"{rend.usuario.first_name} {rend.usuario.last_name}".strip() if rend.usuario else "Sin usuario"
                actividades.append({
                    "id": rend.id,
                    "tipo": "rendicion",
                    "titulo": f"Rendición - {rend.motivo[:25]}..." if rend.motivo and len(rend.motivo) > 25 else f"Rendición - {rend.motivo or 'Sin motivo'}",
                    "subtitulo": nombre_usuario,
                    "estado": rend.estado,
                    "fecha": rend.fecha_compra.isoformat() if rend.fecha_compra else None,
                    "icono": "HeroReceiptPercent",
                    "color": "purple",
                })
        except Exception:
            pass
        
        # Ordenar por fecha descendente y limitar
        actividades.sort(key=lambda x: x.get("fecha") or "", reverse=True)
        actividades = actividades[:limite]
        
        return Response({
            "actividades": actividades,
            "total": len(actividades),
        })


class SoftwareViewSet(viewsets.ModelViewSet):
    queryset = Software.objects.all()
    serializer_class = SoftwareSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff")]

class AcuerdoConfidencialidadBaseViewSet(viewsets.ModelViewSet):
    queryset = AcuerdoConfidencialidadBase.objects.all()
    serializer_class = AcuerdoConfidencialidadBaseSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff")]