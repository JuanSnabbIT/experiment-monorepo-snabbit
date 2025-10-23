from django.apps import AppConfig


class BodegasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bodegas'

    def ready(self):
        import bodegas.signals