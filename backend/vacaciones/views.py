from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.models import PersonalizacionUsuario
from django.db.models import Count, Sum
from .models import *
from .serializers import *


class SolicitudVacacionesViewSet(viewsets.ModelViewSet):
    queryset = SolicitudVacaciones.objects.all()
    serializer_class = SolicitudVacacionesSerializer
    
    def get_queryset(self):
        user = self.request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
        except PersonalizacionUsuario.DoesNotExist:
            return SolicitudVacaciones.objects.none()
        except AttributeError:
            return SolicitudVacaciones.objects.none()
        return SolicitudVacaciones.objects.filter(usuario_empresa__sucursal=sucursal)

    @action(detail=False, methods=['get'], url_path='mis-solicitudes')
    def mis_solicitudes(self, request):
        user = request.user
        solicitudes_usuario = SolicitudVacaciones.objects.filter(usuario_empresa__usuario=user)
        serializer = self.get_serializer(solicitudes_usuario, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='por-usuario')
    def por_usuarioempresa(self, request):
        usuario_empresa_id = request.query_params.get('usuario_empresa')
        if not usuario_empresa_id:
            return Response(
                {"detail": "Debes proporcionar el parámetro usuario_empresa."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = SolicitudVacaciones.objects.filter(usuario_empresa_id=usuario_empresa_id)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="metricas-dashboard")
    def metricas_dashboard(self, request):
        """
        Endpoint para métricas del dashboard de vacaciones.
        """
        from datetime import date, timedelta
        from calendario.models import DiaCalendario
        
        # Obtener empresa del usuario
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=request.user
        ).select_related("sucursal_principal__empresa").first()
        
        if not personalizacion or not personalizacion.sucursal_principal or not personalizacion.sucursal_principal.empresa:
            return Response(
                {"detail": "No se encontró empresa asociada al usuario"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        empresa_id = personalizacion.sucursal_principal.empresa.id
        hoy = date.today()
        
        # Queryset base para solicitudes de la empresa
        qs_base = SolicitudVacaciones.objects.filter(
            usuario_empresa__sucursal__empresa_id=empresa_id
        )
        
        # 1. Conteo por estado
        conteo_estados = dict(qs_base.values_list("estado").annotate(count=Count("id")))
        estados_resultado = {
            "pendiente": conteo_estados.get("1", 0),
            "aprobado": conteo_estados.get("2", 0),
            "rechazado": conteo_estados.get("3", 0),
        }
        
        # 2. Solicitudes pendientes de aprobación
        pendientes_aprobacion = estados_resultado["pendiente"]
        
        # 3. Solicitudes extraordinarias pendientes
        extraordinarias_pendientes = qs_base.filter(
            estado="1",
            es_extraordinaria=True
        ).count()
        
        # 4. Vacaciones próximas (próximos 30 días, aprobadas)
        fecha_30_dias = hoy + timedelta(days=30)
        vacaciones_proximas = list(
            qs_base.filter(
                estado="2",
                fecha_inicio__gte=hoy,
                fecha_inicio__lte=fecha_30_dias
            ).select_related("usuario_empresa__usuario").values(
                "id",
                "usuario_empresa__usuario__first_name",
                "usuario_empresa__usuario__last_name",
                "fecha_inicio",
                "fecha_fin"
            ).order_by("fecha_inicio")[:10]
        )
        proximas_resultado = [
            {
                "id": v["id"],
                "nombre": f"{v['usuario_empresa__usuario__first_name']} {v['usuario_empresa__usuario__last_name']}".strip(),
                "fecha_inicio": v["fecha_inicio"].isoformat(),
                "fecha_fin": v["fecha_fin"].isoformat(),
                "dias_para_inicio": (v["fecha_inicio"] - hoy).days,
            }
            for v in vacaciones_proximas
        ]
        
        # 5. Ausencias hoy (vacaciones aprobadas donde hoy está entre fecha_inicio y fecha_fin)
        ausencias_hoy = list(
            qs_base.filter(
                estado="2",
                fecha_inicio__lte=hoy,
                fecha_fin__gte=hoy
            ).select_related("usuario_empresa__usuario").values(
                "id",
                "usuario_empresa__usuario__first_name",
                "usuario_empresa__usuario__last_name",
                "fecha_fin"
            )[:10]
        )
        ausencias_resultado = [
            {
                "id": a["id"],
                "nombre": f"{a['usuario_empresa__usuario__first_name']} {a['usuario_empresa__usuario__last_name']}".strip(),
                "regresa": a["fecha_fin"].isoformat(),
            }
            for a in ausencias_hoy
        ]
        
        # 6. Próximos feriados (próximos 30 días)
        proximos_feriados = list(
            DiaCalendario.objects.filter(
                es_feriado=True,
                fecha__gte=hoy,
                fecha__lte=fecha_30_dias
            ).values("fecha", "descripcion", "es_irrenunciable").order_by("fecha")[:5]
        )
        feriados_resultado = [
            {
                "fecha": f["fecha"].isoformat(),
                "nombre": f["descripcion"] or "Feriado",
                "es_irrenunciable": f["es_irrenunciable"],
            }
            for f in proximos_feriados
        ]
        
        return Response({
            "resumen": {
                "pendientes_aprobacion": pendientes_aprobacion,
                "extraordinarias_pendientes": extraordinarias_pendientes,
                "ausencias_hoy": len(ausencias_resultado),
            },
            "por_estado": estados_resultado,
            "vacaciones_proximas": proximas_resultado,
            "ausencias_hoy": ausencias_resultado,
            "proximos_feriados": feriados_resultado,
        })