from django.db import models
from core.models import ModeloBase
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

class Activo(ModeloBase):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    # opciones = Q(app_label='bodegas', model='stockitemenbodega') | Q(app_label='bodegas', model='itemenordencompra')
    # content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to=opciones)
    # origen_id = models.PositiveIntegerField()
    # origen = GenericForeignKey('content_type', 'origen_id')
    stock = models.ForeignKey("bodegas.StockItemEnBodega", on_delete=models.SET_NULL, null=True, blank=True)
    cantidad = models.PositiveIntegerField(default=0)
    numero_serie = models.CharField(max_length=50, blank=True, null=True)
    valor = models.IntegerField(default=0)

    def __str__(self):
        return f"Activo {self.numero_serie or self.pk}"

    def get_documentos(self):
        return self.documentoactivo_set.all()

class DocumentoActivo(ModeloBase):
    estado_activado = models.BooleanField(default=False)
    activo = models.ForeignKey(Activo, on_delete=models.CASCADE, related_name='documentos')
    asignado = models.BooleanField(default=False)
    asignado_a = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    firma_asignado = models.TextField(blank=True, null=True)
    en_bodega = models.BooleanField(default=False)
    bodega = models.ForeignKey("bodegas.Bodega", on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Documento {self.pk} - Activo: {self.activo}"

class ImagenActivo(ModeloBase):
    activo = models.ForeignKey(Activo, related_name='imagenes', on_delete=models.CASCADE)
    imagen = models.TextField()

    def __str__(self):
        return f"Imagen de {self.activo}"
