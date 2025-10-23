from django.contrib import admin
from .models import *
# Register your models here.

admin.site.register(Cotizacion)
admin.site.register(ItemCotizacion)
admin.site.register(SeguimientoCotizacion)
admin.site.register(EnvioCorreoCotizacion)
admin.site.register(SolicitanteExterno)
admin.site.register(SolicitanteCotizacion)
admin.site.register(ComentarioCotizacion)