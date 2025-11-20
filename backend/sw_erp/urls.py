"""
URL configuration for sw_erp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django_prometheus import exports

urlpatterns = [
    path("admin/", admin.site.urls),
    re_path(r"^auth/", include("djoser.urls")),
    re_path(r"^auth/", include("djoser.urls.jwt")),
    re_path(r"^auth/", include("djoser.urls.authtoken")),
    path("api/", include("bd_ciudades.urls")),
    path("api/", include("core.urls")),
    path("api/", include("cuentas.urls")),
    path("api/", include("empresas.urls")),
    path("api/", include("calendario.urls")),
    path("api/", include("items.urls")),
    path("api/", include("bodegas.urls")),
    path("api/", include("vacaciones.urls")),
    # path('api/', include('visitas.urls')),
    path("api/", include("recursos.urls")),
    path("api/", include("cotizaciones.urls")),
    # path('api/', include('ordentrabajo.urls')),  # V1 - DESACTIVADA - Usar ordentrabajov2
    path("api/", include("ordentrabajov2.urls")),
    path("api/", include("rendiciones.urls")),
    path("api/", include("visitas.urls")),
    path("api/", include("contratos.urls")),
    # path('api/', include('retroalimentacion.urls')),  # TEMPORAL - Requiere migración a ordentrabajov2
    path("metrics/", exports.ExportToDjangoView, name="prometheus-metrics"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
