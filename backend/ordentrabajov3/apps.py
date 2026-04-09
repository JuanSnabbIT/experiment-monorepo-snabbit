from django.apps import AppConfig


class Ordentrabajov3Config(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ordentrabajov3"
    verbose_name = "Ordenes de Trabajo V3"

    def ready(self):
        import ordentrabajov3.signals  # noqa
