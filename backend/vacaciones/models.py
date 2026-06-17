from django.db import models
from datetime import timedelta
from rest_framework.exceptions import ValidationError as DRFValidationError
from calendario.models import DiaCalendario
from .estados_modelos import *


class SolicitudVacaciones(models.Model):
    usuario_empresa = models.ForeignKey('empresas.UsuarioEmpresa', on_delete=models.CASCADE)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=1, choices=ESTADO_SOLICITUD_VACACIONES, default='1')
    es_extraordinaria = models.BooleanField(default=False)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    comentario = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey("cuentas.User", on_delete=models.SET_NULL, related_name="creado_por", blank=True, null=True)
    aprobado_rechazado_por = models.ForeignKey("cuentas.User", on_delete=models.SET_NULL, related_name="aprobado_rechazado_por", blank=True, null=True)
    firma_usuario = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Solicitud de Vacaciones'
        verbose_name_plural = 'Solicitudes de Vacaciones'

    def __str__(self):
        return f"Solicitud de vacaciones de {self.usuario_empresa.usuario.get_nombre()}"

    def clean(self):
        if self.pk and self.estado == "1":
            # Si es una actualización, no hacer validaciones
            return

        # Validación de fechas
        if self.fecha_fin < self.fecha_inicio:
            raise DRFValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.')

        # Validar que el empleado tiene derecho a vacaciones
        if not self.usuario_empresa.tiene_derecho_a_vacaciones():
            raise DRFValidationError('El empleado aún no tiene derecho a vacaciones.')

        # Validar días disponibles solo si se está aprobando la solicitud
        if self.estado == '2' and not self.es_extraordinaria:
            dias_solicitados = self.calcular_dias_solicitados()
            dias_disponibles = self.usuario_empresa.dias_vacaciones_disponibles()
            if dias_solicitados > dias_disponibles:
                raise DRFValidationError('No tienes suficientes días de vacaciones disponibles.')

        # Validar solicitud extraordinaria pendiente
        if self.es_extraordinaria:
            solicitud_pendiente = SolicitudVacaciones.objects.filter(
                usuario_empresa=self.usuario_empresa,
                es_extraordinaria=True,
                estado='1'  # Estado pendiente
            ).exclude(pk=self.pk).exists()
            if solicitud_pendiente:
                raise DRFValidationError('Ya existe una solicitud extraordinaria pendiente para este empleado.')

    def calcular_dias_solicitados(self):
        dias_totales = (self.fecha_fin - self.fecha_inicio).days + 1
        dias_solicitados = 0
        empresa = self.usuario_empresa.sucursal.empresa

        for i in range(dias_totales):
            dia_actual = self.fecha_inicio + timedelta(days=i)
            dia_calendario = DiaCalendario.objects.filter(fecha=dia_actual, empresa=empresa).first()

            # Contamos solo los días hábiles (lunes a viernes)
            if dia_actual.weekday() < 5:  # 0 es lunes, 4 es viernes
                if dia_calendario:
                    if not dia_calendario.es_feriado:
                        dias_solicitados += 1
                else:
                    dias_solicitados += 1

        return dias_solicitados

    def save(self, *args, **kwargs):
        if not self.pk:
            # Solo limpiar al crear una nueva instancia
            self.clean()
        super().save(*args, **kwargs)
