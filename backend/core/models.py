from django.db import models
from django.forms import ValidationError
from simple_history.models import HistoricalRecords as Historia
from .estados_modelo import OPCIONES_TEMA
from django.contrib.auth.models import Group
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from .managers import PreguntaEnRetroalimentacionManager

def default_dashboard_preferences():
    return {
        "indicadores_economicos": True,
        "empresa_seleccionada": True,
        "actualizaciones_oc" :True,
        "ultimos_eventos": True
    }

class ModeloBase(models.Model):
    fecha_creacion          = models.DateTimeField(auto_now_add=True)
    fecha_modificacion      = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class ModeloBaseHistorico(models.Model):
    fecha_creacion          = models.DateTimeField(auto_now_add=True)
    fecha_modificacion      = models.DateTimeField(auto_now=True)
    historia                = Historia(inherit = True)

    class Meta:
        abstract = True

class PersonalizacionUsuario(ModeloBase):
    usuario = models.OneToOneField("cuentas.User", on_delete=models.CASCADE)
    tema = models.CharField(max_length=1, choices=OPCIONES_TEMA, default="1")
    font_size = models.PositiveIntegerField(default=13)
    sucursal_principal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    dashboard_preferences = models.JSONField(default=default_dashboard_preferences)

    class Meta:
        verbose_name = "Personalizacion del Usuario"
        verbose_name_plural = "Personalizaciones de Usuarios"

class Software(ModeloBase):
    nombre = models.CharField(max_length=100)

    class Meta:
        verbose_name = "Software"
        verbose_name_plural = "Softwares"

    def __str__(self):
        return self.nombre

class AcuerdoConfidencialidadBase(ModeloBaseHistorico):
    titulo = models.CharField(max_length=255, verbose_name="Título del Acuerdo Base")
    contenido = models.TextField(verbose_name="Contenido del Acuerdo Base")

    class Meta:
        verbose_name = "Acuerdo de Confidencialidad Base"
        verbose_name_plural = "Acuerdos de Confidencialidad Base"

    def __str__(self):
        return self.titulo

class DescripcionGrupo(ModeloBaseHistorico):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name='descripcion')
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Descripción del Grupo"
        verbose_name_plural = "Descripciones de Grupos"
 
    def __str__(self):
        return f"Descripcion de {self.group.name}"


class RecursoAccion(ModeloBase):
    """Una acción otorgable de un ViewSet (ej: contratos.condicion_especial / list).

    Catálogo curado a mano — no se auto-genera por introspección de código,
    para que cada acción tenga una descripción legible antes de ser otorgable.
    Motor de autorización asociado: core.permissions.TienePermisoPorAccion.
    Coexiste con el motor de roles hardcodeados (TienePermisoDeRol) — un
    ViewSet usa uno u otro, no ambos.
    """
    recurso = models.CharField(max_length=100, help_text="Ej: contratos.condicion_especial")
    accion = models.CharField(max_length=100, help_text="Ej: list, destroy, cambiar_estado")
    descripcion = models.CharField(max_length=255, blank=True)
    grupos = models.ManyToManyField(Group, blank=True, related_name="acciones_permitidas")

    class Meta:
        unique_together = ("recurso", "accion")
        verbose_name = "Acción de recurso"
        verbose_name_plural = "Acciones de recursos (permisos)"

    def __str__(self):
        return f"{self.recurso}.{self.accion}"


class PreguntaEnRetroalimentacion(ModeloBase):
    texto = models.TextField("Pregunta de retroalimentación")
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to=(
            Q(app_label='cotizaciones', model='cotizacion') |
            Q(app_label='visitas', model='visitasoporte') |
            Q(app_label='bodegas', model='compra') |
            Q(app_label='visitas', model='asistenciausuario') |
            Q(app_label='visitas', model='entregadeequipo') |
            Q(app_label='ordentrabajov2', model='soportetecnico') |
            Q(app_label='ordentrabajov3', model='tareaotv3') |
            Q(app_label='ordentrabajov3', model='ordendetrabajov3')
        )
    )
    activo = models.BooleanField(default=True)

    # Manager personalizado
    objects = PreguntaEnRetroalimentacionManager()

    class Meta:
        verbose_name = "Pregunta de Retroalimentación"
        verbose_name_plural = "Preguntas de Retroalimentación"
        indexes = [models.Index(fields=["content_type", "activo"]),]
        
        
    # def clean(self):
    #     modelos_validos = {
    #         'cotizaciones': ['cotizacion'],
    #         'visitas': ['visitasoporte', 'asistenciausuario', 'entregadeequipo'],
    #         'bodegas': ['compra'],
    #     }
    #     modelos_aceptados = modelos_validos.get(self.content_type.app_label, [])
    #     if self.content_type.model not in modelos_aceptados:
    #         raise ValidationError("Este content_type no es válido para preguntas de retroalimentación.")


    def __str__(self):
        return f"Pregunta para {self.content_type}: {self.texto}"

class IndicadorEconomico(ModeloBase):
    """
    Caché persistente de indicadores económicos del Banco Central (Mindicador.cl).
    Reduce llamadas a API externa y provee histórico confiable.

    Estrategia:
    - Primera fuente de consulta antes de Redis/API externa
    - Se llena automáticamente al consultar fechas nuevas
    - Permite auditoría de valores históricos usados
    """

    TIPO_INDICADOR = [
        ("dolar", "Dólar Observado"),
        ("uf", "UF"),
    ]

    tipo = models.CharField(max_length=20, choices=TIPO_INDICADOR, verbose_name="Tipo de Indicador")
    fecha = models.DateField(verbose_name="Fecha del Indicador")
    valor = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="Valor")
    fuente = models.CharField(max_length=50, default="mindicador.cl", verbose_name="Fuente")

    class Meta:
        verbose_name = "Indicador Económico"
        verbose_name_plural = "Indicadores Económicos"
        unique_together = [["tipo", "fecha"]]
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["tipo", "fecha"]),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha}: ${self.valor}"
