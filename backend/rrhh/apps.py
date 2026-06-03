from django.apps import AppConfig


class RrhhConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rrhh"
    verbose_name = "Recursos Humanos"

    def ready(self):
        import rrhh.signals  # noqa: F401
