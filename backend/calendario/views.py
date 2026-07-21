from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import date
from core.models import PersonalizacionUsuario
from core.permissions import IsAdminOrRRHH
from .serializers import *
from .models import *
import requests
import holidays


class DiaCalendarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrRRHH]
    serializer_class = DiaCalendarioSerializer
    # filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # filterset_fields = ['fecha', 'es_feriado']
    # search_fields = ['descripcion']
    # ordering_fields = ['fecha']
    # ordering = ['fecha']
    # lookup_field = 'fecha'
    # lookup_value_regex = '\d{4}-\d{1,2}-\d{1,2}'

    def get_queryset(self):
        user = self.request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except PersonalizacionUsuario.DoesNotExist:
            return DiaCalendario.objects.none()
        except AttributeError:
            return DiaCalendario.objects.none()
        return DiaCalendario.objects.filter(empresa=empresa)

    @action(detail=False, methods=['post'])
    def generar_calendario_anual(self, request):
        anio = request.data.get('anio')
        if not anio:
            return Response({'detail': 'Debe proporcionar el año.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            anio = int(anio)
        except ValueError:
            return Response({'detail': 'El año proporcionado no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return Response({'detail': 'No se pudo determinar la empresa del usuario.'}, status=status.HTTP_400_BAD_REQUEST)

        fuente = self._generar_calendario_anual(anio, empresa)
        return Response(
            {'status': f'Feriados para el año {anio} generados correctamente.', 'fuente': fuente},
            status=status.HTTP_200_OK,
        )

    def _generar_calendario_anual(self, anio, empresa):
        """
        Pobla DiaCalendario para el año dado.
        Fuente primaria: API oficial digital.gob.cl (incluye es_irrenunciable y tipo).
        Fallback: librería holidays si la API no está disponible.
        Usa update_or_create para poder corregir registros existentes.
        """
        try:
            url = f'https://apis.digital.gob.cl/fl/feriados/{anio}'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            feriados = response.json()
            if not feriados:
                raise ValueError('Respuesta vacía')

            for feriado in feriados:
                fecha_str = feriado.get('fecha')
                try:
                    fecha = date.fromisoformat(fecha_str)
                except (ValueError, TypeError):
                    continue
                DiaCalendario.objects.update_or_create(
                    empresa=empresa,
                    fecha=fecha,
                    defaults={
                        'es_feriado': True,
                        'es_irrenunciable': feriado.get('irrenunciable', '0') == '1',
                        'descripcion': feriado.get('nombre', ''),
                        'tipo': feriado.get('tipo', ''),
                    },
                )
            return 'api_digital_gob'

        except (requests.exceptions.RequestException, ValueError):
            # Fallback: librería holidays (sin es_irrenunciable ni tipo)
            chilean_holidays = holidays.Chile(years=[anio], language='es')
            for fecha, descripcion in chilean_holidays.items():
                DiaCalendario.objects.update_or_create(
                    empresa=empresa,
                    fecha=fecha,
                    defaults={'es_feriado': True, 'descripcion': descripcion},
                )
            return 'holidays_library'

    @action(detail=False, methods=['put', 'patch'], url_path='editar-por-fecha')
    def editar_por_fecha(self, request):
        fecha_str = request.data.get('fecha')
        if not fecha_str:
            return Response({'detail': 'Debe proporcionar la fecha en formato AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha = date.fromisoformat(fecha_str)
        except ValueError:
            return Response({'detail': 'La fecha proporcionada no es válida. Use el formato AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener la empresa del usuario
        user = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return Response({'detail': 'No se pudo determinar la empresa del usuario.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dia_calendario = DiaCalendario.objects.get(fecha=fecha, empresa=empresa)
        except DiaCalendario.DoesNotExist:
            return Response({'detail': f'No se encontró un día con la fecha {fecha_str} para la empresa seleccionada.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = DiaCalendarioSerializer(dia_calendario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)