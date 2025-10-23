from rest_framework_nested import routers
from django.urls import path, include
from .views import *

router = routers.SimpleRouter()

urlpatterns = [
    path('regiones/', regiones, name='regiones'),
    path('region/<int:region_id>/provincias/', provincias_por_region, name='provincias-by-region'),
    path('provincias/<int:provincia_id>/comunas/', comunas_por_provincia, name='comunas-by-provincia'),
    
    path('provincias/', provincias, name='lista_provincias'),
    path('comunas/', comunas, name='lista_comunas'),
]
