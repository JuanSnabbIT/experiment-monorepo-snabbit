from django.apps import AppConfig


class OrdentrabajoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ordentrabajo'

    def ready(self):
        import ordentrabajo.signals