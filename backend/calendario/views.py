from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from core.models import PersonalizacionUsuario
from .serializers import *
from .models import *
import holidays


class DiaCalendarioViewSet(viewsets.ModelViewSet):
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
    # API
    # @action(detail=False, methods=['post'])
    # def generar_calendario_anual(self, request):
    #     anio = request.data.get('anio')
    #     if not anio:
    #         return Response({'error': 'Debe proporcionar el año.'}, status=status.HTTP_400_BAD_REQUEST)
    #     try:
    #         anio = int(anio)
    #     except ValueError:
    #         return Response({'error': 'El año proporcionado no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

    #     # Obtener la empresa del usuario
    #     user = request.user
    #     try:
    #         personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
    #         sucursal = personalizacion.sucursal_principal
    #         empresa = sucursal.empresa
    #     except (PersonalizacionUsuario.DoesNotExist, AttributeError):
    #         return Response({'error': 'No se pudo determinar la empresa del usuario.'}, status=status.HTTP_400_BAD_REQUEST)

    #     # Llamamos a la función para generar los feriados del calendario
    #     success, message = self._generar_calendario_anual(anio, empresa)
    #     if success:
    #         return Response({'status': message}, status=status.HTTP_200_OK)
    #     else:
    #         return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    # def _generar_calendario_anual(self, anio, empresa):
    #     url = f'https://apis.digital.gob.cl/fl/feriados/{anio}'
    #     try:
    #         response = requests.get(url)
    #         response.raise_for_status()  # Raises HTTPError for bad status codes
    #         feriados = response.json()
    #     except requests.exceptions.HTTPError as http_err:
    #         return False, f'Error HTTP al obtener los feriados: {http_err}'
    #     except requests.exceptions.RequestException as e:
    #         return False, f'Error al obtener los feriados: {e}'
    #     except ValueError:
    #         return False, 'Error al decodificar la respuesta del API.'

    #     if not feriados:
    #         return False, f'No hay feriados disponibles para el año {anio}.'

    #     for feriado in feriados:
    #         fecha_str = feriado.get('fecha')
    #         try:
    #             fecha = date.fromisoformat(fecha_str)
    #         except ValueError:
    #             continue  # Skip invalid date formats

    #         descripcion = feriado.get('nombre', '')
    #         irrenunciable_str = feriado.get('irrenunciable', '0')
    #         es_irrenunciable = irrenunciable_str == '1'
    #         tipo = feriado.get('tipo', '')

    #         DiaCalendario.objects.update_or_create(
    #             empresa=empresa,
    #             fecha=fecha,
    #             defaults={
    #                 'es_feriado': True,
    #                 'es_irrenunciable': es_irrenunciable,
    #                 'descripcion': descripcion,
    #                 'tipo': tipo,
    #             }
    #         )
    #     return True, 'Feriados generados correctamente.'
    
    @action(detail=False, methods=['post'])
    def generar_calendario_anual(self, request):
        anio = request.data.get('anio')
        if not anio:
            return Response({'error': 'Debe proporcionar el año.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            anio = int(anio)
        except ValueError:
            return Response({'error': 'El año proporcionado no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener la empresa del usuario
        user = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return Response({'error': 'No se pudo determinar la empresa del usuario.'}, status=status.HTTP_400_BAD_REQUEST)

        # Llamamos a la función para generar los feriados del calendario
        self._generar_calendario_anual(anio, empresa)
        return Response({'status': f'Feriados para el año {anio} generados correctamente.'}, status=status.HTTP_200_OK)

    def _generar_calendario_anual(self, anio, empresa):
        chilean_holidays = holidays.Chile(years=[anio])

        for fecha, descripcion in chilean_holidays.items():
            DiaCalendario.objects.get_or_create(
                empresa=empresa,
                fecha=fecha,
                defaults={'es_feriado': True, 'descripcion': descripcion}
            )

    @action(detail=False, methods=['put', 'patch'], url_path='editar_por_fecha')
    def editar_por_fecha(self, request):
        fecha_str = request.data.get('fecha')
        if not fecha_str:
            return Response({'error': 'Debe proporcionar la fecha en formato AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha = date.fromisoformat(fecha_str)
        except ValueError:
            return Response({'error': 'La fecha proporcionada no es válida. Use el formato AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener la empresa del usuario
        user = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return Response({'error': 'No se pudo determinar la empresa del usuario.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dia_calendario = DiaCalendario.objects.get(fecha=fecha, empresa=empresa)
        except DiaCalendario.DoesNotExist:
            return Response({'error': f'No se encontró un día con la fecha {fecha_str} para la empresa seleccionada.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = DiaCalendarioSerializer(dia_calendario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)