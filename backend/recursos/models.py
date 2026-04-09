from django.db import models
from core.models import ModeloBase, ModeloBaseHistorico
from .estados_modelo import (MARCA_TARJETA_GRAFICA, TIPO_EQUIPO, MARCA_EQUIPO, TIPO_PROCESADOR, GENERACION_PROCESADOR, TAMANIO_RAM, TIPO_ALMACENAMIENTO, SISTEMA_OPERATIVO, CONDICIONES_EQUIPO, TIPO_TARJETA_GRAFICA)
from django.db.models import Q
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class AlmacenamientoEquipo(ModeloBase):
    almacenamiento = models.CharField("Almacenamiento", max_length=20, choices=TIPO_ALMACENAMIENTO, default="OTRO")
    equipo = models.ForeignKey("recursos.Equipo", on_delete=models.CASCADE)
    fecha_instalacion = models.DateField(null=True, blank=True)
    adicional = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Almacenamiento de Equipo"
        verbose_name_plural = "Almacenamientos de Equipos"

    def __str__(self):
        return f"{self.get_almacenamiento_display()} en {self.equipo.numero_serie}"

class SoftwareDeEmpresa(ModeloBase):
    software = models.ForeignKey("core.Software", on_delete=models.CASCADE)
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Software de Empresa"
        verbose_name_plural = "Softwares de Empresas"

    def __str__(self):
        return f"{self.software.nombre} en {self.empresa.nombre}"

class SoftwareInstalado(ModeloBase):
    opciones = Q(app_label='core', model='software') | Q(app_label='recursos', model='softwaredeempresa')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to=opciones)
    software_id = models.PositiveIntegerField()
    software = GenericForeignKey('content_type', 'software_id')
    version = models.CharField(max_length=20, blank=True, null=True)
    clave = models.CharField(max_length=50, blank=True, null=True)
    equipo = models.ForeignKey("recursos.Equipo", on_delete=models.CASCADE)
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Software Instalado"
        verbose_name = "Softwares Instalados"

    def __str__(self):
        return f"Software N°{self.software_id} en {self.equipo.numero_serie}"

class MonitorEquipo(ModeloBase):
    nombre = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    numero_serie = models.CharField(max_length=100, null=True, blank=True)
    accesorios = models.TextField(blank=True)
    observaciones = models.TextField(blank=True)
    equipo = models.ForeignKey("recursos.Equipo", on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Monitor de Equipo"
        verbose_name_plural = "Monitores de Equipos"

    def __str__(self):
        return f"{self.nombre} - {self.modelo} - N°{self.numero_serie}"

class Equipo(ModeloBase):
    nombre_equipo = models.CharField("Nombre del Equipo", max_length=50, blank=True, null=True)
    contraseña_administrador = models.CharField("Contraseña del administrador", max_length=50, null=True, blank=True)
    cliente = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE, related_name='equipos_cliente', null=True, blank=True)
    empresa_propietaria = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="equipos_propietarios",
        null=True,
        blank=True,
        verbose_name="Empresa propietaria",
    )
    registrado_por = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, related_name='equipos_registrados')
    tipo_equipo = models.CharField("Tipo de equipo", max_length=20, choices=TIPO_EQUIPO, default="ESCRITORIO")
    marca = models.CharField("Marca", max_length=20, choices=MARCA_EQUIPO, default="OTRA") #
    modelo = models.CharField("Modelo", max_length=100, blank=True) #
    numero_serie = models.CharField("Número de serie", max_length=100, unique=True)
    # Información del procesador
    id_procesador = models.CharField(max_length=50, null=True, blank=True) #
    tipo_procesador = models.CharField("Tipo de procesador", max_length=10, choices=TIPO_PROCESADOR, default="OTRO") #
    generacion_procesador = models.CharField("Generación del procesador", max_length=10, choices=GENERACION_PROCESADOR, default="OTRA")
    # Especificaciones
    almacenamientos = models.ManyToManyField("self", through="AlmacenamientoEquipo", blank=True)
    ram = models.CharField("Memoria RAM", max_length=10, choices=TAMANIO_RAM, default="OTRA") #
    sistema_operativo = models.CharField("Sistema Operativo", max_length=20, choices=SISTEMA_OPERATIVO, default="OTRO")
    tipo_tarjeta_grafica = models.CharField("Tipo de Tarjeta Gráfica", max_length=20, choices=TIPO_TARJETA_GRAFICA, default="SIN_ESPECIFICAR")
    nombre_tarjeta_grafica = models.CharField("Nombre de Tarjeta Gráfica", max_length=50, null=True, blank=True)
    marca_tarjeta_grafica = models.CharField("Marca de Tarjeta de Gráfica", max_length=50, choices=MARCA_TARJETA_GRAFICA, default="OTRA")
    monitor = models.ManyToManyField("self", through="recursos.MonitorEquipo", blank=True)
    # Control de fechas importantes
    fecha_compra = models.DateField("Fecha de compra", null=True, blank=True) #
    fecha_caducidad_garantia = models.DateField("Fecha de caducidad de garantía", null=True, blank=True)
    condicion_equipo = models.CharField("Condiciones", max_length=20, choices=CONDICIONES_EQUIPO, default="NUEVO")
    estado = models.BooleanField(default=True)
    usuarios = models.ManyToManyField("self", through="recursos.UsuarioEquipo", blank=True)
    software_instalado = models.ManyToManyField("contenttypes.ContentType", through=SoftwareInstalado, blank=True)

    class Meta:
        verbose_name = "Equipo"
        verbose_name_plural = "Equipos"

    def __str__(self):
        return f'{self.tipo_equipo} - {self.marca} {self.modelo} ({self.numero_serie})'

class UsuarioEquipo(ModeloBaseHistorico):
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name='usuario_equipo')
    usuario = models.ForeignKey('empresas.UsuarioEmpresa', on_delete=models.CASCADE, related_name='equipos_usuario')
    fecha_asignacion = models.DateField("Fecha de asignación", auto_now_add=True)
    fecha_devolucion = models.DateField("Fecha de devolución", null=True, blank=True)
    observaciones = models.TextField("Observaciones", blank=True)
    estado = models.BooleanField(default=True)
    fotos = models.ManyToManyField("self", through="recursos.FotoEquipo", blank=True)

    def __str__(self):
        return f'Uso de {self.equipo} por {self.usuario.usuario.get_nombre_completo()}'

    class Meta:
        verbose_name = "Usuario de Equipo"
        verbose_name_plural = "Usuarios de Equipos"
        ordering = ["-fecha_creacion"]

class FotoEquipo(ModeloBase):
    usuario_equipo = models.ForeignKey(UsuarioEquipo, on_delete=models.CASCADE)
    imagen = models.TextField(blank=True)
    descripcion = models.CharField("Descripción", max_length=100, blank=True)
    fecha_tomada = models.DateField(blank=True)

    def __str__(self):
        return f'Foto de {self.usuario_equipo.equipo.numero_serie} - ID {self.id}'


class ItemAsignadoUsuario(ModeloBaseHistorico):
    """
    Registra la asignacion de un item NO serializado a un usuario de empresa cliente.
    La unica fuente valida es un ItemsGuiaSalida cuya guia este vinculada a una OT v3.
    """
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.CASCADE,
        related_name="items_asignados",
        verbose_name="Usuario receptor",
    )
    stock_item = models.ForeignKey(
        "bodegas.StockItemEnBodega",
        on_delete=models.CASCADE,
        related_name="asignaciones_usuario",
        verbose_name="Item de inventario",
    )
    item_guia_origen = models.ForeignKey(
        "bodegas.ItemsGuiaSalida",
        on_delete=models.CASCADE,
        related_name="asignaciones_usuario",
        verbose_name="Item de guia de origen",
        help_text="Obligatorio: unica fuente valida para asignar un item no serializado.",
    )
    cantidad = models.PositiveIntegerField(default=1)
    estado = models.BooleanField(
        default=True,
        verbose_name="Asignacion activa",
        help_text="True = actualmente asignado, False = devuelto",
    )
    fecha_devolucion = models.DateField("Fecha de devolucion", null=True, blank=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Item Asignado a Usuario"
        verbose_name_plural = "Items Asignados a Usuarios"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        nombre = (
            self.stock_item.item.nombre
            if hasattr(self.stock_item, "item") and self.stock_item.item
            else f"StockItem #{self.stock_item_id}"
        )
        return f"{nombre} x{self.cantidad} → {self.usuario}"