from django.apps import AppConfig


class Ordentrabajov2Config(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ordentrabajov2"

    def ready(self):  # Importa señales al cargar la app
        from . import signals  # noqa: F401
