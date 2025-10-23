from django.apps import AppConfig


class VisitasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'visitas'

    def ready(self):
        import visitas.signals