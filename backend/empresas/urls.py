from django.urls import path, include
from rest_framework import routers
from rest_framework_nested.routers import NestedSimpleRouter
from .views import *
from items.views import ItemEmpresaViewset, ProveedorEmpresaViewSet, ProveedorEmpresaItemViewSet

# Registro principal de los viewsets
router = routers.DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'usuarios-empresa', UsuarioEmpresaViewSet, basename="usuario_empresa")
router.register(r'relaciones-empresa', RelacionEmpresaViewSet)

# Crear rutas anidadas para empresas
router_empresa = NestedSimpleRouter(router, r'empresas', lookup="empresa")
router_empresa.register(r'sucursales-empresa', SucursalEmpresaViewSet, basename="empresa_sucursal_empresa")
router_empresa.register(r'proveedores-empresa', ProveedorEmpresaViewSet, basename="empresa_proveedor_empresa")
router_empresa.register(r'items-empresa', ItemEmpresaViewset, basename="empresa_item_empresa")

# Crear rutas anidadas para ProveedorEmpresa dentro de Empresa
router_proveedor_empresa = NestedSimpleRouter(router_empresa, r'proveedores-empresa', lookup="proveedor_empresa")
router_proveedor_empresa.register(r'items', ProveedorEmpresaItemViewSet, basename="proveedor_empresa_items")

# router_item_empresa = NestedSimpleRouter(router_empresa, r'items-empresa', lookup="item_empresa")
# router_item_empresa.register(r'proveedores', ItemEmpresaProveedorViewset, basename="item_empresa_proveedores")

urlpatterns = [
    path('', include(router.urls)),
    path('', include(router_empresa.urls)),
    path('', include(router_proveedor_empresa.urls)),
]
