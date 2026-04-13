from core.models import ModeloBase
from django.db import models

from .estados_modelo import *


class Categoria(ModeloBase):
    nombre = models.CharField(max_length=250)

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ["nombre"]

    def __str__(self):
        return "%s" % (self.nombre)


class Fabricante(models.Model):
    nombre = models.CharField(max_length=64)
    pagina_web = models.CharField(max_length=64, blank=True, null=True)
    email_soporte = models.CharField(max_length=64, blank=True, null=True)
    telefono_soporte = models.CharField(max_length=16, blank=True, null=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = "Fabricantes"
        ordering = ["nombre"]


class ProveedorEmpresa(ModeloBase):
    TIPO_MONEDA_CHOICES = (
        ("1", "USD"),
        ("2", "CLP"),
        ("3", "UF"),
    )

    nombre = models.CharField(max_length=250)
    rut = models.CharField(max_length=250)
    direccion = models.CharField(max_length=250, null=True, blank=True)
    region = models.IntegerField(default=0)
    provincia = models.IntegerField(default=0)
    comuna = models.IntegerField(default=0)
    pagina_web = models.CharField(max_length=250, blank=True, null=True)
    telefono = models.CharField(max_length=16, blank=True, null=True)
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    ejecutivo_asignado = models.CharField(max_length=64, blank=True, null=True)
    email_ejecutivo = models.EmailField(max_length=45, blank=True, null=True)
    catalogo_web = models.CharField(max_length=64, blank=True, null=True)
    recargo_dolar = models.IntegerField(default=5)
    tipo_moneda = models.CharField(
        max_length=1, choices=TIPO_MONEDA_CHOICES, default="2"
    )

    def __str__(self):
        return "%s de %s" % (self.nombre, self.empresa.nombre)

    class Meta:
        verbose_name = "Proveedor Empresa"
        verbose_name_plural = "Proveedores Empresa"


class CampoAdicionalProveedor(ModeloBase):
    nombre = models.CharField(max_length=50)
    proveedor = models.ForeignKey(ProveedorEmpresa, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Campo Adicional del Proveedor"
        verbose_name_plural = "Campos Adicionales de Proveedores"

    def __str__(self):
        return f"{self.nombre} de {self.proveedor.nombre}"


class CampoAdicionalItem(ModeloBase):
    campo = models.ForeignKey(CampoAdicionalProveedor, on_delete=models.CASCADE)
    item = models.ForeignKey("items.ItemEmpresa", on_delete=models.CASCADE)
    valor = models.TextField()

    class Meta:
        verbose_name = "Campo Adicional del Item"
        verbose_name_plural = "Campos Adicionales de Items"

    def __str__(self):
        return f"{self.campo.nombre}: {self.valor} - {self.item.nombre}"


class ItemEmpresa(ModeloBase):
    nombre = models.CharField(max_length=250)
    descripcion_corta = models.CharField(
        "Algo que lo referencie", max_length=250, blank=True, null=True
    )
    fabricante = models.ForeignKey(
        Fabricante,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        help_text="Dejar en blanco si el fabricante es igual al proveedor",
    )
    categoria = models.ForeignKey(
        Categoria, on_delete=models.SET_NULL, null=True, blank=True
    )
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    proveedores_empresa = models.ManyToManyField(
        ProveedorEmpresa, blank=True, related_name="items_proveedor"
    )
    comentarios = models.TextField(blank=True, null=True)
    codigo_barras = models.TextField(blank=True, null=True, unique=True)
    campos_adicionales = models.ManyToManyField(
        CampoAdicionalProveedor, through=CampoAdicionalItem, blank=True
    )
    es_equipo = models.BooleanField(
        default=False,
        verbose_name="Es equipo",
        help_text="Indica si este item representa un equipo que se asigna a un usuario",
    )

    def __str__(self):
        return "%s de %s" % (self.nombre, self.empresa.nombre)


class ImagenItem(models.Model):
    item = models.ForeignKey(
        ItemEmpresa, related_name="imagenes", on_delete=models.CASCADE
    )
    imagen = models.TextField()

    class Meta:
        verbose_name = "Imagen Item"
        verbose_name_plural = "Imagenes Item"

    def __str__(self):
        return f"Imagen de {self.item.nombre}"
