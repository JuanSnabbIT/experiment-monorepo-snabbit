from django.db import models
from core.models import ModeloBase
from .estados_modelo import *


class VisitaSoporte(ModeloBase):
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="empresa", related_name="empresa_visita")
    cliente = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE, related_name="visitas")
    asistencia_usuarios = models.ManyToManyField("self", through="visitas.AsistenciaUsuario", blank=True)
    entrega_equipo = models.ManyToManyField("self", through="visitas.EntregaDeEquipo", blank=True)
    descripcion_servicio = models.TextField("Descripción del servicio realizado", blank=True, help_text="Detalles específicos de lo que se hizo en la visita.")
    estado = models.CharField(max_length=50, choices=ESTADO_VISITA_SOPORTE, default="pendiente")
    # GUIA_SALIDA ONETOONE
    guia_salida = models.OneToOneField("bodegas.GuiaSalida", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Visita Soporte"
        verbose_name_plural = "Visitas Soporte"

    def __str__(self):
        return f"Visita a {self.cliente} de {self.empresa}"

class AsistenciaUsuario(ModeloBase):
    visita = models.ForeignKey(VisitaSoporte, verbose_name="Visita de soporte", on_delete=models.CASCADE, related_name="revisiones")
    estado_revision = models.CharField("Estado Revisión", max_length=50, choices=ESTADO_REVISION_EQUIPO, default="por_revisar")
    observaciones = models.TextField("Observaciones", blank=True, help_text="Detalles sobre el estado del equipo.")
    usuario_equipo = models.ForeignKey("recursos.UsuarioEquipo", on_delete=models.CASCADE, null=True, blank=True)
    observaciones_revision = models.TextField("Observaciones de la Revision", blank=True)

    class Meta:
        verbose_name = "Asistencia Usuario"
        verbose_name_plural = "Asistencias Usuarios"

    def __str__(self):
        return f"Asistencia N°{self.pk} de la Visita N°{self.visita.pk}"

class EntregaDeEquipo(ModeloBase):
    visita = models.ForeignKey(VisitaSoporte, verbose_name="Visita de soporte", on_delete=models.CASCADE, related_name="entregas")
    estado_entrega = models.CharField(max_length=50, choices=ESTADO_ENTREGA_EQUIPO, default="por_entregar")
    equipo = models.ForeignKey("recursos.Equipo", on_delete=models.CASCADE, related_name="entrega", null=True, blank=True)
    observaciones = models.TextField("Observaciones", blank=True)
    usuario_a_entregar = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, blank=True, null=True)
    nombre_quien_recibe = models.TextField(blank=True)
    firma_entregado = models.TextField(blank=True)
    observaciones_entrega = models.TextField("Observaciones de la Entrega", blank=True)

    class Meta:
        verbose_name = "Entrega de Equipo"
        verbose_name_plural = "Entregas de Equipos"

    def __str__(self):
        return f"Entrega de Equipo en Visita #{self.visita.pk}"

# class InsumoEnVisitaSoporte(ModeloBase): #QUITAR
#     visita = models.ForeignKey(VisitaSoporte, verbose_name="Visita de soporte", on_delete=models.CASCADE)
#     guia = models.OneToOneField("bodegas.GuiaSalida", on_delete=models.CASCADE)

# class RegistroActividad(ModeloBase):
#     visita = models.ForeignKey(VisitaSoporte, verbose_name="Visita de soporte", on_delete=models.CASCADE, related_name="actividades")
#     descripcion = models.TextField("Descripción de la actividad", help_text="Detalles de la actividad realizada durante la visita.")
#     fecha_hora = models.DateTimeField("Fecha y hora de la actividad", auto_now_add=True)
#     ubicacion = models.TextField("Ubicación", blank=True, help_text="Lugar donde se realizó la actividad.")

#     def __str__(self):
#         return f"Actividad en {self.visita} - {self.fecha_hora.strftime('%d/%m/%Y %H:%M')}"

# class MaterialUtilizado(models.Model):
#     visita = models.ForeignKey(VisitaSoporte, verbose_name="Visita de soporte", on_delete=models.CASCADE, related_name="materiales")
#     nombre_material = models.CharField("Nombre del material", max_length=100)
#     cantidad = models.PositiveIntegerField("Cantidad utilizada")
#     descripcion = models.TextField("Descripción", blank=True, help_text="Detalles adicionales sobre el material utilizado.")
    
#     ### proximamente vinculo con Bodega o Orden de compra

#     def __str__(self):
#         return f"Material {self.nombre_material} utilizado en {self.visita}"