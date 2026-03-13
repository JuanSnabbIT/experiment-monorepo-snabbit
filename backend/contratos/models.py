from django.db import models
from core.models import ModeloBase, ModeloBaseHistorico
from .estados_modelo import *	
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from datetime import date
from dateutil.relativedelta import relativedelta
import uuid

class ContratoEmpresaCliente(ModeloBaseHistorico):
    empresa_prestadora = models.ForeignKey("empresas.Empresa", related_name="contratos_como_prestadora", on_delete=models.CASCADE)
    empresa_cliente = models.ForeignKey("empresas.Empresa", related_name="contratos_como_cliente", on_delete=models.CASCADE)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS_CONTRATO, default='borrador')
    observaciones = models.TextField(blank=True, null=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CONTRATO, default='servicios')
    dia_facturacion = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        help_text="Día del mes (1-28) en que se genera automáticamente la prefactura.",
    )

    # Relaciones ManyToMany con modelos intermedios
    servicios_genericos = models.ManyToManyField(
        ContentType,
        through="contratos.ContratoServicio",
        limit_choices_to={"model__in": ["servicio", "planservicio"]},  # Restringe a solo estos modelos
        related_name="contratos_genericos",
        verbose_name="Servicios o Planes"
    )
    visitas = models.ManyToManyField("contratos.Visita", through="contratos.ContratoVisita")
    licencias = models.ManyToManyField("contratos.Licencia", through="contratos.ContratoLicencia")
    condiciones_especiales = models.ManyToManyField("contratos.CondicionEspecial", through="contratos.ContratoCondicionEspecial")
    usuarios_vinculados = models.ManyToManyField("empresas.UsuarioEmpresa", through="contratos.UsuarioVinculadoContrato")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(fecha_fin__gte=models.F('fecha_inicio')) | models.Q(fecha_fin__isnull=True),
                name="check_fecha_inicio_menor_fecha_fin"
            )
        ]

    def clean(self):
        if self.fecha_inicio > date.today():
            raise ValidationError("La fecha de inicio no puede estar en el futuro.")
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

    def actualizar_estado(self):
        """Verifica si el contrato ha vencido y actualiza su estado automáticamente."""
        if self.fecha_fin and self.fecha_fin < date.today():
            self.estado = 'finalizado'

    def save(self, *args, **kwargs):
        """Antes de guardar, verifica si el contrato ha vencido."""
        self.actualizar_estado()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contrato: {self.empresa_prestadora} ↔ {self.empresa_cliente} ({self.estado})"

class EnvioContratoFirmaUsuario(ModeloBase):
    firma = models.TextField(blank=True, null=True)
    fecha_firma = models.DateTimeField(blank=True, null=True)
    firmado = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(blank=True, null=True)
    enviado = models.BooleanField(default=False)
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    usuario = models.ForeignKey("contratos.UsuarioVinculadoContrato", on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Envio del Contrato para Firmar"
        verbose_name_plural = "Envios de Contratos para Firmar"

class UsuarioVinculadoContrato(ModeloBase):
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE)
    contrato = models.ForeignKey("contratos.ContratoEmpresaCliente", on_delete=models.CASCADE, related_name="vinculos_contrato")
    fecha_vinculacion = models.DateField(auto_now_add=True)
    tipo_usuario = models.CharField(max_length=20, choices=TIPOS_USUARIO_CONTRATO, default='gerencia')

    class Meta:
        verbose_name = "Usuario Vinculado al Contrato"
        verbose_name_plural = "Usuarios Vinculados a Contratos"

    def __str__(self):
        return f"{self.usuario} en {self.contrato}"


class NotificacionVentanaLicencia(ModeloBase):
    licencia = models.ForeignKey(
        "contratos.ContratoLicencia",
        on_delete=models.CASCADE,
        related_name="notificaciones_ventana",
    )
    ciclo_inicio = models.DateField(verbose_name="Inicio del ciclo notificado")
    destinatarios = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Notificación de Ventana de Licencia"
        verbose_name_plural = "Notificaciones de Ventana de Licencia"
        constraints = [
            models.UniqueConstraint(
                fields=["licencia", "ciclo_inicio"],
                name="unique_notificacion_ventana_licencia_ciclo",
            )
        ]

    def __str__(self):
        return f"Ventana {self.licencia_id} - {self.ciclo_inicio}"

class CaracteristicaServicio(ModeloBase):
    nombre = models.CharField(max_length=255, verbose_name="Nombre de la Característica")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción de la Característica")

    class Meta:
        verbose_name = "Característica del Servicio"
        verbose_name_plural = "Características de los Servicios"

    def __str__(self):
        return self.nombre

class Servicio(ModeloBase):
    nombre = models.CharField(max_length=255, verbose_name="Nombre del Servicio")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción del Servicio")
    categoria = models.CharField(max_length=255, verbose_name="Categoría del Servicio", choices=CATEGORIAS_SERVICIO, default='soporte')
    caracteristicas = models.ManyToManyField(CaracteristicaServicio, blank=True, related_name="servicios", verbose_name="Características del Servicio")

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

    def __str__(self):
        return self.nombre

class Visita(ModeloBase):
    descripcion = models.CharField(max_length=255, verbose_name="Descripción de la Visita")

    class Meta:
        verbose_name = "Visita"
        verbose_name_plural = "Visitas"

    def __str__(self):
        return self.descripcion

class Licencia(ModeloBase):
    nombre = models.CharField(max_length=255, verbose_name="Nombre de la Licencia")
    proveedor = models.CharField(max_length=255, verbose_name="Proveedor de Licencias", blank=True, null=True)

    class Meta:
        verbose_name = "Licencia"
        verbose_name_plural = "Licencias"

    def __str__(self):
        return f"{self.nombre} - {self.proveedor}"


class PersonaLicenciataria(ModeloBaseHistorico):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="personas_licenciatarias",
    )
    usuario_empresa = models.OneToOneField(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        related_name="persona_licenciataria",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=255)
    es_interno = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Persona Licenciataria"
        verbose_name_plural = "Personas Licenciatarias"
        ordering = ["nombre", "id"]

    @classmethod
    def sincronizar_desde_usuario_empresa(cls, usuario_empresa, empresa=None):
        empresa_obj = empresa or usuario_empresa.sucursal.empresa
        defaults = {
            "empresa": empresa_obj,
            "nombre": usuario_empresa.usuario.get_nombre_completo(),
            "es_interno": True,
            "activo": True,
        }
        persona, created = cls.objects.get_or_create(
            usuario_empresa=usuario_empresa,
            defaults=defaults,
        )
        cambios = []
        if persona.empresa_id != empresa_obj.id:
            persona.empresa = empresa_obj
            cambios.append("empresa")
        nombre_actual = usuario_empresa.usuario.get_nombre_completo()
        if persona.nombre != nombre_actual:
            persona.nombre = nombre_actual
            cambios.append("nombre")
        if not persona.es_interno:
            persona.es_interno = True
            cambios.append("es_interno")
        if not persona.activo:
            persona.activo = True
            cambios.append("activo")
        if cambios:
            persona.save(update_fields=cambios + ["fecha_modificacion"])

        correo = CorreoPersonaLicenciataria.obtener_o_crear_para_persona(
            persona=persona,
            correo=usuario_empresa.usuario.email,
            es_principal=True,
            es_corporativo=True,
            verificado=True,
        )
        return persona, correo

    @classmethod
    def obtener_o_crear_externa(cls, empresa, nombre, correo):
        correo_normalizado = CorreoPersonaLicenciataria.normalizar_correo(correo)
        correo_existente = CorreoPersonaLicenciataria.objects.filter(
            empresa=empresa,
            correo_normalizado=correo_normalizado,
        ).select_related("persona").first()
        if correo_existente:
            persona = correo_existente.persona
            if nombre and persona.nombre != nombre:
                persona.nombre = nombre
                persona.save(update_fields=["nombre", "fecha_modificacion"])
            return persona, correo_existente

        persona = cls.objects.create(
            empresa=empresa,
            nombre=nombre or correo_normalizado,
            es_interno=False,
            activo=True,
        )
        correo_obj = CorreoPersonaLicenciataria.objects.create(
            persona=persona,
            empresa=empresa,
            correo=correo_normalizado,
            es_principal=True,
            es_corporativo=False,
        )
        return persona, correo_obj

    def __str__(self):
        return self.nombre


class CorreoPersonaLicenciataria(ModeloBaseHistorico):
    persona = models.ForeignKey(
        "contratos.PersonaLicenciataria",
        on_delete=models.CASCADE,
        related_name="correos",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="correos_licenciatarios",
    )
    correo = models.EmailField(max_length=250)
    correo_normalizado = models.EmailField(max_length=250, db_index=True)
    es_principal = models.BooleanField(default=False)
    es_corporativo = models.BooleanField(default=True)
    verificado = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Correo de Persona Licenciataria"
        verbose_name_plural = "Correos de Personas Licenciatarias"
        ordering = ["-es_principal", "correo", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "correo_normalizado"],
                name="unique_correo_persona_licenciataria_empresa",
            )
        ]

    @staticmethod
    def normalizar_correo(correo):
        correo_normalizado = (correo or "").strip().lower()
        validate_email(correo_normalizado)
        return correo_normalizado

    @classmethod
    def obtener_o_crear_para_persona(
        cls,
        persona,
        correo,
        es_principal=False,
        es_corporativo=False,
        verificado=False,
    ):
        correo_normalizado = cls.normalizar_correo(correo)
        correo_obj, created = cls.objects.get_or_create(
            empresa=persona.empresa,
            correo_normalizado=correo_normalizado,
            defaults={
                "persona": persona,
                "correo": correo_normalizado,
                "es_principal": es_principal,
                "es_corporativo": es_corporativo,
                "verificado": verificado,
                "activo": True,
            },
        )
        cambios = []
        if correo_obj.persona_id != persona.id:
            correo_obj.persona = persona
            cambios.append("persona")
        if correo_obj.correo != correo_normalizado:
            correo_obj.correo = correo_normalizado
            cambios.append("correo")
        if es_principal and not correo_obj.es_principal:
            correo_obj.es_principal = True
            cambios.append("es_principal")
        if es_corporativo and not correo_obj.es_corporativo:
            correo_obj.es_corporativo = True
            cambios.append("es_corporativo")
        if verificado and not correo_obj.verificado:
            correo_obj.verificado = True
            cambios.append("verificado")
        if not correo_obj.activo:
            correo_obj.activo = True
            cambios.append("activo")
        if cambios:
            correo_obj.save(update_fields=cambios + ["fecha_modificacion"])
        elif created and es_principal:
            correo_obj._asegurar_principal_unico()
        return correo_obj

    def clean(self):
        super().clean()
        self.correo_normalizado = self.normalizar_correo(self.correo)
        if self.persona_id and self.empresa_id != self.persona.empresa_id:
            self.empresa = self.persona.empresa

    def _asegurar_principal_unico(self):
        if self.es_principal and self.persona_id:
            self.persona.correos.exclude(pk=self.pk).filter(es_principal=True).update(es_principal=False)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self._asegurar_principal_unico()

    def __str__(self):
        return self.correo

class CondicionEspecial(ModeloBaseHistorico):
    titulo = models.CharField(max_length=255, verbose_name="Título de la Condición")
    descripcion = models.TextField(verbose_name="Detalle de la Condición")

    class Meta:
        verbose_name = "Condición Especial"
        verbose_name_plural = "Condiciones Especiales"

    def __str__(self):
        return self.titulo

class ContratoServicio(ModeloBaseHistorico):
    contrato = models.ForeignKey("contratos.ContratoEmpresaCliente", on_delete=models.CASCADE, related_name="contrato_servicios")

    # Configuración de ContentType para polimorfismo
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to={"model__in": ["servicio", "planservicio"]},  # Solo permite Servicio y PlanServicio
        verbose_name="Tipo de Servicio"
    )
    object_id = models.PositiveIntegerField(verbose_name="ID del Servicio o Plan")
    servicio_generico = GenericForeignKey("content_type", "object_id")

    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Precio Unitario")

    def save(self, *args, **kwargs):
        """Asigna automáticamente el content_type basado en la selección."""
        if isinstance(self.servicio_generico, Servicio):
            self.content_type = ContentType.objects.get_for_model(Servicio)
        elif isinstance(self.servicio_generico, PlanServicio):
            self.content_type = ContentType.objects.get_for_model(PlanServicio)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.servicio_generico} ({self.cantidad}) en {self.contrato}"

class ContratoVisita(ModeloBaseHistorico):
    contrato = models.ForeignKey("contratos.ContratoEmpresaCliente", on_delete=models.CASCADE, related_name="contrato_visitas")
    visita = models.ForeignKey("contratos.Visita", on_delete=models.CASCADE, related_name="visita_contratos")
    frecuencia = models.CharField(max_length=20, choices=FRECUENCIA_VISITA, verbose_name="Frecuencia de Visitas")
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad de Visitas")

    class Meta:
        verbose_name = "Visita del Contrato"
        verbose_name_plural = "Visitas del Contrato"

    def __str__(self):
        return f"{self.visita.descripcion} ({self.frecuencia}, {self.cantidad} veces) en {self.contrato}"

class ContratoLicencia(ModeloBaseHistorico):
    contrato = models.ForeignKey("contratos.ContratoEmpresaCliente", on_delete=models.CASCADE, related_name="contrato_licencias")
    licencia = models.ForeignKey("contratos.Licencia", on_delete=models.CASCADE, related_name="licencia_contratos")
    tipo_modalidad = models.CharField(max_length=20, choices=TIPO_MODALIDAD_LICENCIA, verbose_name="Tipo de Modalidad", default='otros')
    otro_tipo = models.CharField(max_length=255, blank=True, null=True, verbose_name="Otro Tipo de Modalidad")
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad de Licencias")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Precio Unitario")
    tipo_moneda = models.CharField(max_length=3, choices=TIPO_MONEDA_LICENCIA, default="USD")
    fecha_inicio = models.DateField(blank=True, null=True, verbose_name="Fecha de Inicio")
    fecha_fin = models.DateField(blank=True, null=True, verbose_name="Fecha de Fin")
    partner = models.BooleanField(default=True, verbose_name="Partner")
    estado = models.CharField(max_length=20, choices=ESTADOS_CONTRATO_LICENCIA, default='activa', verbose_name="Estado")
    usuarios = models.ManyToManyField("empresas.UsuarioEmpresa", through="contratos.UsuarioVinculadoLicencia")
    
    class Meta:
        verbose_name = "Licencia del Contrato"
        verbose_name_plural = "Licencias del Contrato"

    def _fecha_base_periodo(self):
        return self.fecha_inicio or self.contrato.fecha_inicio

    def _inicio_periodo(self):
        """
        Calcula el inicio del período vigente según modalidad:
        - modalidades anuales: bloques anuales desde fecha_inicio.
        - otras modalidades: el período inicia en la activación.
        """
        fecha_base = self._fecha_base_periodo()
        if not fecha_base:
            return None

        if self.tipo_modalidad in ('anual', 'p1y-a', 'p1y-m'):
            rd = relativedelta(date.today(), fecha_base)
            bloques = rd.years
            return fecha_base + relativedelta(years=bloques)

        return fecha_base

    @property
    def dias_desde_inicio_periodo(self):
        inicio = self._inicio_periodo()
        return None if not inicio else (date.today() - inicio).days

    @property
    def puede_reducir(self):
        dias = self.dias_desde_inicio_periodo
        return dias is not None and 0 <= dias <= 7

    @property
    def en_ventana_edicion(self):
        return self.puede_reducir

    @property
    def puede_aumentar_cupos(self):
        return self.estado not in ('vencida', 'cancelada')

    @property
    def puede_reducir_cupos(self):
        return self.estado not in ('vencida', 'cancelada') and self.en_ventana_edicion

    @property
    def puede_cancelar(self):
        return self.estado in ('activa', 'suspendida', 'vencida') and self.en_ventana_edicion

    @property
    def puede_desvincular_usuarios(self):
        if not self.partner:
            return True
        return self.puede_reducir_cupos

    @property
    def dias_licenciamiento(self):
        fecha_base = self._fecha_base_periodo()
        if not fecha_base:
            return None
        return (date.today() - fecha_base).days

    @property
    def dias_restantes_licencia(self):
        fecha_cierre = self.fecha_fin or self.contrato.fecha_fin
        if not fecha_cierre:
            return None
        return (fecha_cierre - date.today()).days

    @property
    def inicio_periodo_actual(self):
        return self._inicio_periodo()

    @property
    def fin_periodo_actual(self):
        inicio = self.inicio_periodo_actual
        if not inicio:
            return None
        return inicio + relativedelta(days=7)

    @property
    def dias_hasta_fin_periodo(self):
        fin = self.fin_periodo_actual
        if not fin:
            return None
        return (fin - date.today()).days

    def mensaje_inicio_periodo(self):
        dias = self.dias_desde_inicio_periodo
        if dias == 0:
            return "Hoy comienza la ventana de edición de la licencia."
        if dias == 7:
            return "Hoy finaliza la ventana de edición de la licencia."
        return ""

    @property
    def mensaje_ventana_edicion(self):
        if self.en_ventana_edicion:
            return "Dentro de esta ventana puedes aumentar cupos, reducir cupos, desvincular usuarios o cancelar la licencia."
        if self.puede_aumentar_cupos:
            return "Fuera de la ventana solo se permite aumentar cupos. No se puede reducir, desvincular usuarios ni cancelar la licencia."
        return "La licencia no admite cambios de cupos ni cancelación en su estado actual."

    @property
    def dias_hasta_fin_edicion(self):
        return self.dias_hasta_fin_periodo

    def _actualizar_estado_automatico(self):
        """Actualiza el estado según fecha_fin. Los estados manuales (suspendida, cancelada) no se modifican."""
        if self.estado in ('suspendida', 'cancelada'):
            return
        fecha_cierre = self.fecha_fin or (self.contrato.fecha_fin if self.contrato_id else None)
        if fecha_cierre and fecha_cierre < date.today():
            self.estado = 'vencida'
        elif self.estado == 'vencida':
            # Si se extiende la fecha y ya no está vencida, volver a activa
            self.estado = 'activa'

    def clean(self):
        super().clean()
        if not self.contrato_id:
            return

        if self.pk:
            original = ContratoLicencia.objects.get(pk=self.pk).cantidad
            nueva = self.cantidad

            if nueva > original and not self.puede_aumentar_cupos:
                raise ValidationError(
                    "No puedes aumentar cupos cuando la licencia está vencida o cancelada."
                )

            if nueva < original and not self.puede_reducir_cupos:
                raise ValidationError(
                    "No puedes reducir cupos fuera de los 7 días posteriores al inicio del ciclo vigente."
                )

            if nueva < self.vinculos_licencia.count():
                raise ValidationError(
                    "No puedes reducir cupos por debajo de los usuarios actualmente vinculados."
                )

    def save(self, *args, **kwargs):
        self._actualizar_estado_automatico()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.licencia.nombre} ({self.cantidad}) en {self.contrato}"

class UsuarioVinculadoLicencia(ModeloBaseHistorico):
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, blank=True, null=True)
    licencia = models.ForeignKey("contratos.ContratoLicencia", on_delete=models.CASCADE, related_name="vinculos_licencia")
    correo_persona = models.ForeignKey(
        "contratos.CorreoPersonaLicenciataria",
        on_delete=models.SET_NULL,
        related_name="asignaciones_licencia",
        blank=True,
        null=True,
    )
    fecha_asignacion = models.DateField(auto_now_add=True)
    nombre = models.CharField(max_length=50, blank=True, null=True)
    correo_generico = models.EmailField(blank=True, null=True)

    class Meta:
        verbose_name = "Usuario Vinculado a la Licencia"
        verbose_name_plural = "Usuarios Vinculados a Licencias"
        constraints = [
            models.UniqueConstraint(
                fields=["licencia", "correo_persona"],
                condition=models.Q(correo_persona__isnull=False),
                name="unique_vinculo_licencia_correo_persona",
            )
        ]

    @property
    def persona_licenciataria(self):
        return self.correo_persona.persona if self.correo_persona else None

    @property
    def correo_asignado(self):
        if self.correo_persona:
            return self.correo_persona.correo
        if self.usuario_id:
            return self.usuario.usuario.email
        return self.correo_generico

    @property
    def nombre_asignado(self):
        persona = self.persona_licenciataria
        if persona:
            return persona.nombre
        if self.usuario_id:
            return self.usuario.usuario.get_nombre_completo()
        return self.nombre

    @property
    def es_externo(self):
        persona = self.persona_licenciataria
        if persona:
            return not persona.es_interno
        return self.usuario_id is None

    def _resolver_correo_persona(self):
        if self.correo_persona_id:
            return

        if self.usuario_id:
            _, correo_obj = PersonaLicenciataria.sincronizar_desde_usuario_empresa(
                self.usuario,
                empresa=self.licencia.contrato.empresa_cliente if self.licencia_id else None,
            )
            self.correo_persona = correo_obj
            return

        if self.correo_generico:
            nombre = self.nombre or self.correo_generico
            empresa = self.licencia.contrato.empresa_cliente if self.licencia_id else None
            if empresa is None:
                raise ValidationError("No se pudo determinar la empresa cliente para el correo asignado.")
            _, correo_obj = PersonaLicenciataria.obtener_o_crear_externa(
                empresa=empresa,
                nombre=nombre,
                correo=self.correo_generico,
            )
            self.correo_persona = correo_obj
            return

    def _sincronizar_campos_legacy(self):
        if not self.correo_persona_id:
            return

        persona = self.correo_persona.persona
        if persona.usuario_empresa_id:
            self.usuario = persona.usuario_empresa
            self.nombre = None
            self.correo_generico = None
            return

        self.usuario = None
        self.nombre = persona.nombre
        self.correo_generico = self.correo_persona.correo

    def clean(self):
        super().clean()
        if not self.licencia_id:
            return

        self._resolver_correo_persona()

        if not self.correo_persona_id and not self.usuario_id and not self.correo_generico:
            raise ValidationError("Debe indicar un correo o una persona licenciataria para el vínculo.")

        if self.correo_persona_id:
            if self.correo_persona.empresa_id != self.licencia.contrato.empresa_cliente_id:
                raise ValidationError(
                    "El correo asignado debe pertenecer a la empresa cliente del contrato de licencia."
                )

            existe = UsuarioVinculadoLicencia.objects.exclude(pk=self.pk).filter(
                licencia=self.licencia,
                correo_persona=self.correo_persona,
            )
            if existe.exists():
                raise ValidationError("Este correo ya está vinculado a la licencia.")

        self._sincronizar_campos_legacy()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre_asignado or self.correo_asignado} en {self.licencia}"

class ContratoCondicionEspecial(ModeloBaseHistorico):
    contrato = models.ForeignKey("contratos.ContratoEmpresaCliente", on_delete=models.CASCADE, related_name="contrato_condiciones_especiales")
    condicion = models.ForeignKey("contratos.CondicionEspecial", on_delete=models.CASCADE, related_name="condicion_contratos", blank=True, null=True)
    texto = models.TextField(blank=True, null=True, verbose_name="Texto de condición personalizada")

    class Meta:
        verbose_name = "Condición Especial del Contrato"
        verbose_name_plural = "Condiciones Especiales del Contrato"

    def __str__(self):
        if self.condicion:
            return f"{self.condicion.titulo} en {self.contrato}"
        return f"Condición personalizada en {self.contrato}"

class PlanServicio(ModeloBase):
    nombre = models.CharField(max_length=255, verbose_name="Nombre del Plan")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción del Plan")
    servicios = models.ManyToManyField(Servicio, related_name="planes", verbose_name="Servicios incluidos en el Plan")

    class Meta:
        verbose_name = "Plan de Servicio"
        verbose_name_plural = "Planes de Servicio"

    def __str__(self):
        return self.nombre

class AcuerdoConfidencialidadContrato(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="firmas_confidencialidad"
    )
    acuerdo_base = models.ForeignKey(
        "core.AcuerdoConfidencialidadBase",
        on_delete=models.CASCADE,
        related_name="firmas",
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = "Firma de Acuerdo de Confidencialidad"
        verbose_name_plural = "Firmas de Acuerdos de Confidencialidad"

    def __str__(self):
        return f"Firma de {self.acuerdo_base.titulo} para Contrato #{self.contrato.id}"


class FacturaContrato(ModeloBaseHistorico):
    """Prefactura mensual generada a partir de un contrato activo.

    Representa el documento de prefacturación que se genera automáticamente
    (vía Celery) o manualmente para un período de facturación específico.
    La factura real se emite en un sistema externo; aquí solo se registra
    el estado de prefacturación y el documento asociado.
    """

    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="facturas",
    )
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="facturas_emitidas",
    )
    empresa_cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="facturas_recibidas",
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_FACTURA_CONTRATO,
        default="borrador",
    )
    periodo_inicio = models.DateField(
        help_text="Inicio del período de facturación.",
    )
    periodo_fin = models.DateField(
        help_text="Fin del período de facturación.",
    )
    fecha_emision = models.DateField(
        blank=True,
        null=True,
        help_text="Fecha en que se marcó como 'Por facturar'.",
    )
    monto_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text="Monto total calculado de la prefactura.",
    )
    moneda = models.CharField(
        max_length=5,
        choices=TIPO_MONEDA_LICENCIA,
        default="2",
        help_text="Moneda de la factura.",
    )
    resultado = models.JSONField(
        blank=True,
        null=True,
        help_text="Desglose detallado: servicios, licencias, recargos, etc.",
    )
    comentario = models.TextField(blank=True, default="")
    documento_factura = models.FileField(
        upload_to="facturas_contratos/",
        blank=True,
        null=True,
        help_text="Documento de factura emitido externamente.",
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="facturas_contrato_creadas",
    )
    actualizado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="facturas_contrato_actualizadas",
    )

    class Meta:
        verbose_name = "Factura de Contrato"
        verbose_name_plural = "Facturas de Contratos"
        ordering = ["-periodo_inicio"]
        constraints = [
            models.UniqueConstraint(
                fields=["contrato", "periodo_inicio", "periodo_fin"],
                name="unique_factura_periodo_contrato",
            ),
        ]

    def __str__(self):
        return (
            f"Factura #{self.pk} — {self.contrato.nombre} "
            f"({self.periodo_inicio} → {self.periodo_fin}) [{self.get_estado_display()}]"
        )
