from django.db import models
from empresas.models import Empresa


class DiaCalendario(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    fecha = models.DateField()
    es_feriado = models.BooleanField(default=True)
    es_irrenunciable = models.BooleanField(default=False)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    tipo = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name = 'Día del Calendario'
        verbose_name_plural = 'Días del Calendario'
        ordering = ['fecha']

    def __str__(self):
        return f"{self.fecha} - {'Feriado' if self.es_feriado else 'Laborable'}"

# class VacacionesUsuario(models.Model):
#     usuario_empresa = models.OneToOneField('empresas.UsuarioEmpresa', on_delete=models.CASCADE)
#     dias_acumulados = models.FloatField(default=0)
#     dias_tomados = models.FloatField(default=0)

#     class Meta:
#         verbose_name = 'Vacaciones del Usuario'
#         verbose_name_plural = 'Vacaciones de los Usuarios'

#     def __str__(self):
#         return f"Vacaciones de {self.usuario_empresa.usuario.get_nombre()}"

#     def calcular_dias_acumulados(self):
#         fecha_ingreso = self.usuario_empresa.fecha_ingreso
#         if fecha_ingreso:
#             hoy = date.today()
#             dias_trabajados = self.calcular_dias_trabajados(fecha_ingreso, hoy)
#             # Supongamos que el empleado acumula 1 día de vacaciones por cada 20 días trabajados
#             self.dias_acumulados = dias_trabajados / 20
#             self.save()

#     def calcular_dias_trabajados(self, fecha_inicio, fecha_fin):
#         dias_totales = (fecha_fin - fecha_inicio).days + 1  # +1 para incluir el día de inicio
#         dias_trabajados = 0

#         for i in range(dias_totales):
#             dia_actual = fecha_inicio + timedelta(days=i)
#             dia_calendario = DiaCalendario.objects.filter(fecha=dia_actual).first()

#             # Excluimos fines de semana y feriados
#             if dia_actual.weekday() < 5:  # 0 es lunes, 6 es domingo
#                 if dia_calendario:
#                     if not dia_calendario.es_feriado:
#                         dias_trabajados += 1
#                 else:
#                     # Si el día no está en el calendario, asumimos que es laborable
#                     dias_trabajados += 1

#         return dias_trabajados

#     @property
#     def dias_disponibles(self):
#         return self.dias_acumulados - self.dias_tomados