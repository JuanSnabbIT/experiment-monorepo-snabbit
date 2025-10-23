from django.http import JsonResponse, HttpResponseNotFound
from .models import *
from .serializers import *


def provincias_por_region(request, region_id):
    try:
        region = Region.objects.using("db_comunas").get(region_id=region_id)
        provincias = Provincia.objects.using("db_comunas").filter(provincia_region=region_id).values('provincia_id', 'provincia_nombre')

        return JsonResponse(list(provincias), safe=False)
    except Region.DoesNotExist:
        return HttpResponseNotFound('La región no existe.')


def region(request, region):
    try:
        region = Region.objects.using("db_comunas").get(region_id=region)
        return JsonResponse({'region': {'region_id': region.region_id, 'region_nombre': region.region_nombre}})
    except Region.DoesNotExist:
        return HttpResponseNotFound('La región no existe.')
    

def regiones(request):
    try:
        regiones = Region.objects.using("db_comunas").values('region_id', 'region_nombre')
        return JsonResponse(list(regiones), safe=False)
    except Region.DoesNotExist:
        return HttpResponseNotFound('No se encontraron regiones.')


    

def comunas_por_provincia(request, provincia_id):
    try:
        provincia = Provincia.objects.using('db_comunas').get(provincia_id=provincia_id)
        comunas = Comuna.objects.using('db_comunas').filter(comuna_provincia=provincia).values('comuna_id', 'comuna_nombre')

        return JsonResponse(list(comunas), safe=False)
    except (Region.DoesNotExist, Provincia.DoesNotExist):
        return HttpResponseNotFound('La comuna no existe.')
        
def provincias(request):
    try:
        provincias = Provincia.objects.using('db_comunas').values('provincia_id', 'provincia_nombre', 'provincia_region')
        return JsonResponse(list(provincias), safe=False)    
    except (Provincia.DoesNotExist):
        return HttpResponseNotFound('No hay Provincias')
    
def comunas(request):
    try:
        comunas = Comuna.objects.using('db_comunas').values('comuna_id', 'comuna_nombre', 'comuna_provincia')
        return JsonResponse(list(comunas), safe=False)
    except (Comuna.DoesNotExist):
        return HttpResponseNotFound('No hay Comunas')