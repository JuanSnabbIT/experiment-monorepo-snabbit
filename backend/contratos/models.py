from datetime import date
from decimal import Decimal
import uuid

from dateutil.relativedelta import relativedelta
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models

from core.models import ModeloBase, ModeloBaseHistorico

from .estados_modelo import *


class ContratoEmpresaCliente(ModeloBaseHistorico):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        related_name="contratos_como_prestadora",
        on_delete=models.CASCADE,
    )
    empresa_cliente = models.ForeignKey(
        "empresas.Empresa",
        related_name="contratos_como_cliente",
        on_delete=models.CASCADE,
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=30, choices=ESTADOS_CONTRATO, default="borrador")
    observaciones = models.TextField(blank=True, null=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CONTRATO, default="servicios")
    moneda_cobro = models.CharField(max_length=3, choices=TIPO_MONEDA_LICENCIA, default="USD")
    forma_pago_contractual = models.CharField(
        max_length=20,
        choices=FORMAS_PAGO_COMERCIALES,
        default="mensual",
    )
    forma_pago_venta = models.CharField(
        max_length=20,
        choices=FORMAS_PAGO_VENTA,
        blank=True,
        null=True,
    )
    cuotas_venta = models.JSONField(default=list, blank=True)
    dia_facturacion = models.PositiveSmallIntegerField(blank=True, null=True)
    precio_visita_adicional = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Precio visita adicional",
        help_text="Precio unitario de la visita adicional en el contexto de prefacturacion.",
    )

    contrato_anterior = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="renovaciones",
        help_text="Contrato del cual se originó esta renovación.",
    )

    lugar_firma = models.CharField(max_length=255, blank=True, null=True, verbose_name="Lugar de firma")
    fecha_firma = models.DateField(blank=True, null=True, verbose_name="Fecha de firma del contrato")
    renovacion_automatica = models.BooleanField(default=True, verbose_name="Renovación automática")
    dias_aviso_termino = models.PositiveIntegerField(default=60, verbose_name="Días de aviso previo para término")
    documento_final_url = models.TextField(blank=True, null=True, verbose_name="URL del documento final firmado")

    requiere_nda = models.BooleanField(
        default=False,
        verbose_name="Requiere acuerdo de confidencialidad",
        help_text="Si se activa, no se puede enviar a aprobacion del cliente sin tener al menos un NDA firmado.",
    )

    plantilla = models.ForeignKey(
        "contratos.PlantillaContrato",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos",
        verbose_name="Plantilla utilizada",
    )

    servicios_genericos = models.ManyToManyField(
        ContentType,
        through="contratos.ContratoServicio",
        limit_choices_to={"model__in": ["servicio", "planservicio"]},
        related_name="contratos_genericos",
        verbose_name="Servicios o planes",
    )
    visitas = models.ManyToManyField("contratos.Visita", through="contratos.ContratoVisita")
    licencias = models.ManyToManyField("contratos.Licencia", through="contratos.ContratoLicencia")
    condiciones_especiales = models.ManyToManyField(
        "contratos.CondicionEspecial",
        through="contratos.ContratoCondicionEspecial",
    )
    usuarios_vinculados = models.ManyToManyField(
        "empresas.UsuarioEmpresa",
        through="contratos.UsuarioVinculadoContrato",
    )

    ESTADOS_EDITABLES = ("borrador", "cambios_solicitados")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(fecha_fin__gte=models.F("fecha_inicio"))
                | models.Q(fecha_fin__isnull=True),
                name="check_fecha_inicio_menor_fecha_fin",
            )
        ]

    def clean(self):
        if self.fecha_inicio > date.today():
            raise ValidationError("La fecha de inicio no puede estar en el futuro.")
        if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

    def actualizar_estado(self):
        if self.fecha_fin and self.fecha_fin < date.today():
            self.estado = "finalizado"

    def save(self, *args, **kwargs):
        self.actualizar_estado()
        super().save(*args, **kwargs)

    @property
    def puede_editar_contenido(self):
        return self.estado in self.ESTADOS_EDITABLES

    @property
    def destinatario_principal(self):
        return self.vinculos_contrato.filter(es_destinatario_principal=True).first()

    @property
    def total_items_comerciales(self):
        return sum(
            item.total_para_forma_pago_contractual for item in self.items_comerciales.all()
        )

    def __str__(self):
        return f"Contrato: {self.empresa_prestadora} <-> {self.empresa_cliente} ({self.estado})"


class EnvioContratoFirmaUsuario(ModeloBase):
    firma = models.TextField(blank=True, null=True)
    fecha_firma = models.DateTimeField(blank=True, null=True)
    firmado = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(blank=True, null=True)
    enviado = models.BooleanField(default=False)
    ip_respuesta = models.GenericIPAddressField(blank=True, null=True)
    pdf_congelado = models.BinaryField(blank=True, null=True)
    snapshot_contrato = models.JSONField(blank=True, null=True, default=dict)
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    usuario = models.ForeignKey("contratos.UsuarioVinculadoContrato", on_delete=models.CASCADE)


class EnvioContratoAprobacion(ModeloBase):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="envios_aprobacion",
    )
    destinatario = models.ForeignKey(
        "contratos.UsuarioVinculadoContrato",
        on_delete=models.CASCADE,
        related_name="envios_aprobacion",
    )
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    fecha_envio = models.DateTimeField(blank=True, null=True)
    enviado = models.BooleanField(default=False)
    respondido = models.BooleanField(default=False)
    aprobado = models.BooleanField(blank=True, null=True)
    fecha_respuesta = models.DateTimeField(blank=True, null=True)
    ip_respuesta = models.GenericIPAddressField(blank=True, null=True)
    comentario_respuesta = models.TextField(blank=True, null=True)
    pdf_congelado = models.BinaryField(blank=True, null=True)
    snapshot_contrato = models.JSONField(blank=True, null=True, default=dict)
    version_envio = models.PositiveIntegerField(default=1)
    deprecado = models.BooleanField(default=False)
    fecha_deprecacion = models.DateTimeField(blank=True, null=True)
    motivo_deprecacion = models.CharField(max_length=255, blank=True, null=True)


class UsuarioVinculadoContrato(ModeloBase):
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, blank=True, null=True)
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="vinculos_contrato",
    )
    fecha_vinculacion = models.DateField(auto_now_add=True)
    tipo_usuario = models.CharField(max_length=20, choices=TIPOS_USUARIO_CONTRATO, default="gerencia")
    nombre = models.CharField(max_length=255, blank=True, null=True)
    correo_generico = models.EmailField(max_length=250, blank=True, null=True)
    correo_normalizado = models.EmailField(max_length=250, blank=True, null=True, db_index=True)
    es_destinatario_principal = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["contrato", "usuario"],
                condition=models.Q(usuario__isnull=False),
                name="unique_vinculo_contrato_usuario",
            ),
            models.UniqueConstraint(
                fields=["contrato", "correo_normalizado"],
                condition=models.Q(correo_normalizado__isnull=False),
                name="unique_vinculo_contrato_correo",
            ),
            models.UniqueConstraint(
                fields=["contrato"],
                condition=models.Q(es_destinatario_principal=True),
                name="unique_destinatario_principal_contrato",
            ),
        ]

    @property
    def es_externo(self):
        return self.usuario_id is None

    @property
    def nombre_display(self):
        if self.usuario_id:
            return self.usuario.usuario.get_nombre_completo()
        return self.nombre or ""

    @property
    def correo_display(self):
        if self.usuario_id:
            return self.usuario.usuario.email
        return self.correo_generico or ""

    def clean(self):
        super().clean()
        if not self.contrato_id:
            return
        if not self.usuario_id and not self.correo_generico:
            raise ValidationError("Debe indicar un usuario existente o un contacto manual con correo.")
        if self.usuario_id:
            if self.usuario.sucursal.empresa_id != self.contrato.empresa_cliente_id:
                raise ValidationError(
                    "El usuario vinculado debe pertenecer a la empresa cliente del contrato."
                )
            self.nombre = None
            self.correo_generico = None
            self.correo_normalizado = CorreoPersonaLicenciataria.normalizar_correo(
                self.usuario.usuario.email
            )
        else:
            if not self.nombre:
                raise ValidationError("Debe indicar el nombre del contacto manual.")
            self.correo_normalizado = CorreoPersonaLicenciataria.normalizar_correo(
                self.correo_generico
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre_display or self.correo_display} en {self.contrato}"


class NotificacionVentanaLicencia(ModeloBase):
    licencia = models.ForeignKey(
        "contratos.ContratoLicencia",
        on_delete=models.CASCADE,
        related_name="notificaciones_ventana",
    )
    ciclo_inicio = models.DateField(verbose_name="Inicio del ciclo notificado")
    destinatarios = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["licencia", "ciclo_inicio"],
                name="unique_notificacion_ventana_licencia_ciclo",
            )
        ]

    def __str__(self):
        return f"Ventana {self.licencia_id} - {self.ciclo_inicio}"


class CaracteristicaServicio(ModeloBase):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="caracteristicas_servicio_catalogo",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=255, verbose_name="Nombre de la caracteristica")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripcion")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class ServicioCaracteristica(ModeloBaseHistorico):
    MODO_INCLUYE = "incluye"
    MODO_NO_INCLUYE = "no_incluye"
    MODO_CHOICES = (
        (MODO_INCLUYE, "Incluye"),
        (MODO_NO_INCLUYE, "No incluye"),
    )

    servicio = models.ForeignKey(
        "contratos.Servicio",
        on_delete=models.CASCADE,
        related_name="alcance_items",
    )
    caracteristica = models.ForeignKey(
        "contratos.CaracteristicaServicio",
        on_delete=models.CASCADE,
        related_name="servicios_configurados",
    )
    modo = models.CharField(max_length=20, choices=MODO_CHOICES, default=MODO_INCLUYE)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["servicio", "caracteristica"],
                name="unique_servicio_caracteristica_alcance",
            )
        ]

    def __str__(self):
        return f"{self.servicio} - {self.get_modo_display()} {self.caracteristica}"


class CondicionEspecial(ModeloBaseHistorico):
    titulo = models.CharField(max_length=255, verbose_name="Titulo de la Condicion")
    descripcion = models.TextField(verbose_name="Detalle de la Condicion")
    multa_incumplimiento = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Condicion Especial"
        verbose_name_plural = "Condiciones Especiales"

    def __str__(self):
        return self.titulo


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
            self.persona.correos.exclude(pk=self.pk).filter(es_principal=True).update(
                es_principal=False
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self._asegurar_principal_unico()

    def __str__(self):
        return self.correo


class Servicio(ModeloBase):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="servicios_catalogo",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=255, verbose_name="Nombre del servicio")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripcion del servicio")
    categoria = models.CharField(
        max_length=255,
        verbose_name="Categoria del servicio",
        choices=CATEGORIAS_SERVICIO,
        default="soporte",
    )
    caracteristicas = models.ManyToManyField(
        CaracteristicaServicio,
        blank=True,
        related_name="servicios",
        verbose_name="Caracteristicas del servicio",
    )
    version = models.PositiveIntegerField(default=1)
    servicio_origen = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="versiones_servicio",
        blank=True,
        null=True,
    )
    version_anterior = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="siguiente_version_servicio",
        blank=True,
        null=True,
    )
    activo = models.BooleanField(default=True)
    es_vigente = models.BooleanField(default=True)
    precio_clp = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    precio_uf = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    precio_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    veces_por_mes_default = models.PositiveIntegerField(default=1)
    formas_pago_permitidas = models.JSONField(default=list, blank=True)
    incluye = models.TextField(blank=True, null=True, verbose_name="Incluye")
    no_incluye = models.TextField(blank=True, null=True, verbose_name="No incluye")
    clausulas_especiales = models.TextField(blank=True, null=True, verbose_name="Clausulas especiales")

    def obtener_items_alcance(self):
        return list(
            self.alcance_items.select_related("caracteristica").order_by("orden", "id")
        )

    def obtener_resumen_alcance(self):
        items = self.obtener_items_alcance()
        if not items and self.caracteristicas.exists():
            return {
                "incluye": list(self.caracteristicas.all()),
                "no_incluye": [],
            }
        resumen = {"incluye": [], "no_incluye": []}
        for item in items:
            resumen[item.modo].append(item.caracteristica)
        return resumen

    def construir_texto_alcance(self, modo):
        resumen = self.obtener_resumen_alcance()
        items = resumen.get(modo, [])
        if not items:
            return None
        return "\n".join(
            (
                f"{item.nombre}: {item.descripcion}"
                if item.descripcion
                else item.nombre
            )
            for item in items
        )

    def get_precio_por_moneda(self, moneda):
        return {
            "CLP": self.precio_clp,
            "UF": self.precio_uf,
            "USD": self.precio_usd,
        }.get(moneda, self.precio_usd)

    def __str__(self):
        return self.nombre


class Visita(ModeloBase):
    descripcion = models.CharField(max_length=255, verbose_name="Descripcion de la visita")

    def __str__(self):
        return self.descripcion


class Licencia(ModeloBase):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="licencias_catalogo",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=255, verbose_name="Nombre de la licencia")
    proveedor = models.CharField(max_length=255, verbose_name="Proveedor", blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    numero_parte = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Número de parte (código de licencia)',
    )
    precio_compra = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de partner',
    )
    precio_venta = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de venta sugerido',
    )
    precio_modalidad_p1m = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio P1M',
    )
    precio_venta_p1m = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de venta sugerido P1M',
    )
    precio_modalidad_p1m_compromiso_p1y = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio P1M con compromiso P1Y',
    )
    precio_venta_p1m_compromiso_p1y = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de venta sugerido P1M con compromiso P1Y',
    )
    precio_modalidad_p1y = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio P1Y',
    )
    precio_venta_p1y = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de venta sugerido P1Y',
    )
    precio_modalidad_pago_unico = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio Pago único',
    )
    precio_venta_pago_unico = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name='Precio de venta sugerido Pago único',
    )
    moneda = models.CharField(
        max_length=3,
        choices=TIPO_MONEDA_LICENCIA,
        default='USD',
        verbose_name='Moneda',
    )
    activo = models.BooleanField(default=True, verbose_name='Activo')

    def __str__(self):
        proveedor = self.proveedor or 'Sin proveedor'
        return f"{self.nombre} - {proveedor}"


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
        persona, _created = cls.objects.get_or_create(
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


class PlanServicio(ModeloBaseHistorico):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="planes_servicio_catalogo",
        blank=True,
        null=True,
    )
    nombre = models.CharField(max_length=255, verbose_name="Nombre del Plan")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripcion del Plan")
    version = models.PositiveIntegerField(default=1)
    plan_origen = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="versiones_plan",
        blank=True,
        null=True,
    )
    version_anterior = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="siguiente_version_plan",
        blank=True,
        null=True,
    )
    activo = models.BooleanField(default=True)
    es_vigente = models.BooleanField(default=True)
    precio_clp = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    precio_uf = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    precio_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    veces_por_mes_default = models.PositiveIntegerField(default=1)
    num_visitas_mensuales = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Visitas presenciales mensuales incluidas",
        help_text="Numero de visitas presenciales mensuales incluidas en este plan.",
    )
    formas_pago_permitidas = models.JSONField(default=list, blank=True)
    incluye = models.TextField(blank=True, null=True, verbose_name="Incluye")
    no_incluye = models.TextField(blank=True, null=True, verbose_name="No incluye")
    clausulas_especiales = models.TextField(blank=True, null=True, verbose_name="Clausulas especiales")
    servicios = models.ManyToManyField(
        Servicio,
        through="contratos.PlanServicioDetalle",
        related_name="planes",
        verbose_name="Servicios incluidos en el Plan",
        blank=True,
    )

    class Meta:
        verbose_name = "Plan de Servicio"
        verbose_name_plural = "Planes de Servicio"

    def obtener_items_alcance_resueltos(self):
        agrupados = {}
        detalles = self.detalles_servicio.select_related("servicio_version").prefetch_related(
            "servicio_version__alcance_items__caracteristica",
            "servicio_version__caracteristicas",
        )
        for detalle in detalles:
            servicio = detalle.servicio_version
            resumen = servicio.obtener_resumen_alcance()
            for modo in (ServicioCaracteristica.MODO_INCLUYE, ServicioCaracteristica.MODO_NO_INCLUYE):
                for caracteristica in resumen.get(modo, []):
                    registro = agrupados.setdefault(
                        caracteristica.id,
                        {
                            "caracteristica": caracteristica,
                            "incluye": set(),
                            "no_incluye": set(),
                        },
                    )
                    registro[modo].add(servicio.nombre)
        return list(agrupados.values())

    def construir_texto_alcance(self, modo):
        bloques = []
        for item in self.obtener_items_alcance_resueltos():
            servicios = sorted(item[modo])
            if not servicios:
                continue
            descripcion = (
                f"{item['caracteristica'].nombre}: {item['caracteristica'].descripcion}"
                if item["caracteristica"].descripcion
                else item["caracteristica"].nombre
            )
            bloques.append(f"{descripcion} ({', '.join(servicios)})")
        if not bloques:
            return None
        return "\n".join(bloques)

    def get_precio_por_moneda(self, moneda):
        return {
            "CLP": self.precio_clp,
            "UF": self.precio_uf,
            "USD": self.precio_usd,
        }.get(moneda, self.precio_usd)

    def __str__(self):
        return self.nombre


class PlanServicioDetalle(ModeloBaseHistorico):
    plan = models.ForeignKey(
        "contratos.PlanServicio",
        on_delete=models.CASCADE,
        related_name="detalles_servicio",
    )
    servicio_version = models.ForeignKey(
        "contratos.Servicio",
        on_delete=models.PROTECT,
        related_name="detalles_en_planes",
    )
    orden = models.PositiveIntegerField(default=0)
    obligatorio = models.BooleanField(default=True)
    cantidad_default = models.PositiveIntegerField(default=1)
    veces_por_mes_default = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["orden", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "servicio_version"],
                name="unique_plan_servicio_detalle",
            )
        ]

    def __str__(self):
        return f"{self.plan} -> {self.servicio_version}"


def _serializar_caracteristica_servicio(caracteristica):
    return {
        "id": caracteristica.id,
        "nombre": caracteristica.nombre,
        "descripcion": caracteristica.descripcion,
    }


def _serializar_alcance_item_servicio(item):
    return {
        "id": item.id,
        "caracteristica_id": item.caracteristica_id,
        "caracteristica": _serializar_caracteristica_servicio(item.caracteristica),
        "modo": item.modo,
        "orden": item.orden,
    }


def _construir_snapshot_componentes_plan(plan):
    detalles = plan.detalles_servicio.select_related("servicio_version").prefetch_related(
        "servicio_version__caracteristicas",
        "servicio_version__alcance_items__caracteristica",
    )
    componentes = []
    for detalle in detalles:
        servicio = detalle.servicio_version
        alcance_items = list(
            servicio.alcance_items.select_related("caracteristica").order_by("orden", "id")
        )
        componentes.append(
            {
                "servicio_version_id": detalle.servicio_version_id,
                "nombre": servicio.nombre,
                "descripcion": servicio.descripcion,
                "categoria": servicio.categoria,
                "categoria_label": servicio.get_categoria_display(),
                "obligatorio": detalle.obligatorio,
                "cantidad_default": detalle.cantidad_default,
                "veces_por_mes_default": detalle.veces_por_mes_default,
                "orden": detalle.orden,
                "caracteristicas": [
                    _serializar_caracteristica_servicio(caracteristica)
                    for caracteristica in servicio.caracteristicas.all()
                ],
                "alcance_caracteristicas": [
                    _serializar_alcance_item_servicio(item) for item in alcance_items
                ],
                "incluye": servicio.construir_texto_alcance("incluye") or servicio.incluye,
                "no_incluye": servicio.construir_texto_alcance("no_incluye")
                or servicio.no_incluye,
                "clausulas_especiales": servicio.clausulas_especiales,
            }
        )
    return componentes


class ContratoItemComercial(ModeloBaseHistorico):
    TIPO_ORIGEN_CHOICES = (
        ("servicio", "Servicio"),
        ("plan", "Plan"),
    )

    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="items_comerciales",
    )
    tipo_origen = models.CharField(max_length=20, choices=TIPO_ORIGEN_CHOICES)
    servicio_version = models.ForeignKey(
        "contratos.Servicio",
        on_delete=models.PROTECT,
        related_name="items_contractuales",
        blank=True,
        null=True,
    )
    plan_version = models.ForeignKey(
        "contratos.PlanServicio",
        on_delete=models.PROTECT,
        related_name="items_contractuales",
        blank=True,
        null=True,
    )
    catalogo_version_id = models.PositiveIntegerField(blank=True, null=True)
    snapshot_nombre = models.CharField(max_length=255)
    snapshot_descripcion = models.TextField(blank=True, null=True)
    snapshot_incluye = models.TextField(blank=True, null=True)
    snapshot_no_incluye = models.TextField(blank=True, null=True)
    snapshot_clausulas = models.TextField(blank=True, null=True)
    snapshot_componentes_plan = models.JSONField(default=list, blank=True)
    cantidad = models.PositiveIntegerField(default=1)
    veces_por_mes = models.PositiveIntegerField(default=1)
    forma_pago = models.CharField(
        max_length=20,
        choices=FORMAS_PAGO_COMERCIALES,
        default="mensual",
    )
    moneda = models.CharField(max_length=3, choices=TIPO_MONEDA_LICENCIA, default="USD")
    precio_unitario_contratado = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    total_mensual = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    total_anual = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    total_pago_unico = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    es_addon = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    num_visitas_mensuales = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Visitas presenciales mensuales",
        help_text="Heredado del plan al contratar. Editable por contrato.",
    )
    snapshot_num_visitas_mensuales = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Snapshot: visitas presenciales mensuales",
        help_text="Valor congelado al enviar a aprobacion/firma.",
    )

    class Meta:
        ordering = ["orden", "id"]

    @property
    def referencia_catalogo(self):
        return self.servicio_version or self.plan_version

    @property
    def total_para_forma_pago_contractual(self):
        forma = self.contrato.forma_pago_contractual if self.contrato_id else self.forma_pago
        if forma == "pago_unico":
            return self.total_pago_unico
        if forma == "anual":
            return self.total_anual
        return self.total_mensual

    def recalcular_totales(self):
        cantidad = Decimal(self.cantidad or 0)
        veces = Decimal(self.veces_por_mes or 0)
        precio = Decimal(self.precio_unitario_contratado or 0)
        self.total_pago_unico = precio * cantidad
        self.total_mensual = precio * cantidad * veces
        self.total_anual = self.total_mensual * Decimal("12")

    def clean(self):
        super().clean()
        if self.tipo_origen == "servicio" and not self.servicio_version_id:
            raise ValidationError("Debe indicar la version del servicio.")
        if self.tipo_origen == "plan" and not self.plan_version_id:
            raise ValidationError("Debe indicar la version del plan.")
        if self.tipo_origen == "servicio":
            self.plan_version = None
            referencia = self.servicio_version
        else:
            self.servicio_version = None
            referencia = self.plan_version

        if referencia:
            self.catalogo_version_id = referencia.pk
            if not self.snapshot_nombre:
                self.snapshot_nombre = referencia.nombre
            if not self.snapshot_descripcion:
                self.snapshot_descripcion = referencia.descripcion
            if not self.snapshot_incluye:
                self.snapshot_incluye = getattr(referencia, "incluye", None)
            if not self.snapshot_no_incluye:
                self.snapshot_no_incluye = getattr(referencia, "no_incluye", None)
            if not self.snapshot_clausulas:
                self.snapshot_clausulas = getattr(referencia, "clausulas_especiales", None)
            if not self.precio_unitario_contratado:
                self.precio_unitario_contratado = referencia.get_precio_por_moneda(self.moneda)
            if not self.veces_por_mes:
                self.veces_por_mes = getattr(referencia, "veces_por_mes_default", 1) or 1
            if self.num_visitas_mensuales is None:
                self.num_visitas_mensuales = getattr(referencia, "num_visitas_mensuales", None)
            if self.snapshot_num_visitas_mensuales is None:
                self.snapshot_num_visitas_mensuales = getattr(referencia, "num_visitas_mensuales", None)

            if self.tipo_origen == "plan" and not self.snapshot_componentes_plan:
                self.snapshot_componentes_plan = _construir_snapshot_componentes_plan(
                    referencia
                )

        self.recalcular_totales()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.snapshot_nombre} en {self.contrato}"


# DEPRECATED: usar ContratoItemComercial para contratos nuevos.
# Este modelo existe por compatibilidad con contratos creados antes de la migracion a items_comerciales.
# No agregar nuevas instancias directamente — los PDFs y renderers ya usan items_comerciales con fallback.
class ContratoServicio(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="contrato_servicios",
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to={"model__in": ["servicio", "planservicio"]},
        verbose_name="Tipo de Servicio",
    )
    object_id = models.PositiveIntegerField(verbose_name="ID del Servicio o Plan")
    servicio_generico = GenericForeignKey("content_type", "object_id")
    item_comercial = models.OneToOneField(
        "contratos.ContratoItemComercial",
        on_delete=models.SET_NULL,
        related_name="legacy_contrato_servicio",
        blank=True,
        null=True,
    )
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad")
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Precio Unitario",
    )

    def sync_item_comercial(self):
        referencia = self.servicio_generico
        if referencia is None or not self.contrato_id:
            return None

        tipo_origen = "plan" if isinstance(referencia, PlanServicio) else "servicio"
        defaults = {
            "tipo_origen": tipo_origen,
            "servicio_version": referencia if tipo_origen == "servicio" else None,
            "plan_version": referencia if tipo_origen == "plan" else None,
            "catalogo_version_id": referencia.pk,
            "snapshot_nombre": referencia.nombre,
            "snapshot_descripcion": getattr(referencia, "descripcion", None),
            "snapshot_incluye": getattr(referencia, "incluye", None),
            "snapshot_no_incluye": getattr(referencia, "no_incluye", None),
            "snapshot_clausulas": getattr(referencia, "clausulas_especiales", None),
            "cantidad": self.cantidad,
            "veces_por_mes": getattr(referencia, "veces_por_mes_default", 1) or 1,
            "forma_pago": self.contrato.forma_pago_contractual,
            "moneda": self.contrato.moneda_cobro,
            "precio_unitario_contratado": self.precio_unitario
            or referencia.get_precio_por_moneda(self.contrato.moneda_cobro),
        }
        item = self.item_comercial
        if item is None:
            item = ContratoItemComercial.objects.create(contrato=self.contrato, **defaults)
        else:
            for field, value in defaults.items():
                setattr(item, field, value)
            item.contrato = self.contrato
            item.save()
        self.item_comercial = item
        return item

    def save(self, *args, **kwargs):
        if isinstance(self.servicio_generico, Servicio):
            self.content_type = ContentType.objects.get_for_model(Servicio)
        elif isinstance(self.servicio_generico, PlanServicio):
            self.content_type = ContentType.objects.get_for_model(PlanServicio)

        super().save(*args, **kwargs)
        if self.contrato_id and self.object_id:
            self.sync_item_comercial()
            super().save(update_fields=["item_comercial", "fecha_modificacion"])

    def __str__(self):
        return f"{self.servicio_generico} ({self.cantidad}) en {self.contrato}"


class ContratoVisita(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="contrato_visitas",
    )
    visita = models.ForeignKey(
        "contratos.Visita",
        on_delete=models.CASCADE,
        related_name="visita_contratos",
    )
    frecuencia = models.CharField(
        max_length=20,
        choices=FRECUENCIA_VISITA,
        verbose_name="Frecuencia de Visitas",
    )
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad de Visitas")
    visitas_usadas = models.PositiveIntegerField(
        default=0, verbose_name="Visitas Usadas"
    )
    precio_visita_adicional = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Precio por visita adicional",
        help_text="Precio cobrado al cliente por cada visita que exceda la cantidad acordada. Si es null, se usa el precio general del contrato.",
    )

    class Meta:
        verbose_name = "Visita del Contrato"
        verbose_name_plural = "Visitas del Contrato"

    def __str__(self):
        return f"{self.visita.descripcion} ({self.frecuencia}, {self.cantidad} veces) en {self.contrato}"


class ContratoLicencia(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="contrato_licencias",
    )
    licencia = models.ForeignKey(
        "contratos.Licencia",
        on_delete=models.CASCADE,
        related_name="licencia_contratos",
    )
    tipo_modalidad = models.CharField(
        max_length=20,
        choices=TIPO_MODALIDAD_LICENCIA,
        verbose_name="Tipo de Modalidad",
        default="otros",
    )
    otro_tipo = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Otro Tipo de Modalidad",
    )
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad de Licencias")
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Precio Unitario",
    )
    tipo_moneda = models.CharField(max_length=3, choices=TIPO_MONEDA_LICENCIA, default="USD")
    fecha_inicio = models.DateField(blank=True, null=True, verbose_name="Fecha de Inicio")
    fecha_fin = models.DateField(blank=True, null=True, verbose_name="Fecha de Fin")
    partner = models.BooleanField(default=True, verbose_name="Partner")
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_CONTRATO_LICENCIA,
        default="activa",
        verbose_name="Estado",
    )
    usuarios = models.ManyToManyField(
        "empresas.UsuarioEmpresa",
        through="contratos.UsuarioVinculadoLicencia",
    )

    class Meta:
        verbose_name = "Licencia del Contrato"
        verbose_name_plural = "Licencias del Contrato"

    def _fecha_base_periodo(self):
        return self.fecha_inicio or self.contrato.fecha_inicio

    def _inicio_periodo(self):
        fecha_base = self._fecha_base_periodo()
        if not fecha_base:
            return None

        if self.tipo_modalidad in ("anual", "p1y-a", "p1y-m"):
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
        return self.estado not in ("vencida", "cancelada")

    @property
    def puede_reducir_cupos(self):
        return self.estado not in ("vencida", "cancelada") and self.en_ventana_edicion

    @property
    def puede_cancelar(self):
        return self.estado in ("activa", "suspendida", "vencida") and self.en_ventana_edicion

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
            return "Hoy comienza la ventana de edicion de la licencia."
        if dias == 7:
            return "Hoy finaliza la ventana de edicion de la licencia."
        return ""

    @property
    def mensaje_ventana_edicion(self):
        if self.en_ventana_edicion:
            return (
                "Dentro de esta ventana puedes aumentar cupos, reducir cupos, "
                "desvincular usuarios o cancelar la licencia."
            )
        if self.puede_aumentar_cupos:
            return (
                "Fuera de la ventana solo se permite aumentar cupos. "
                "No se puede reducir, desvincular usuarios ni cancelar la licencia."
            )
        return "La licencia no admite cambios de cupos ni cancelacion en su estado actual."

    @property
    def dias_hasta_fin_edicion(self):
        return self.dias_hasta_fin_periodo

    def _actualizar_estado_automatico(self):
        if self.estado in ("suspendida", "cancelada"):
            return
        fecha_cierre = self.fecha_fin or (self.contrato.fecha_fin if self.contrato_id else None)
        if fecha_cierre and fecha_cierre < date.today():
            self.estado = "vencida"
        elif self.estado == "vencida":
            self.estado = "activa"

    def clean(self):
        super().clean()
        if not self.contrato_id:
            return

        if self.tipo_moneda != self.contrato.moneda_cobro:
            self.tipo_moneda = self.contrato.moneda_cobro

        if self.pk:
            original = ContratoLicencia.objects.get(pk=self.pk).cantidad
            nueva = self.cantidad

            if nueva > original and not self.puede_aumentar_cupos:
                raise ValidationError(
                    "No puedes aumentar cupos cuando la licencia esta vencida o cancelada."
                )

            if nueva < original and not self.puede_reducir_cupos:
                raise ValidationError(
                    "No puedes reducir cupos fuera de los 7 dias posteriores al inicio del ciclo vigente."
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
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    licencia = models.ForeignKey(
        "contratos.ContratoLicencia",
        on_delete=models.CASCADE,
        related_name="vinculos_licencia",
    )
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
                raise ValidationError(
                    "No se pudo determinar la empresa cliente para el correo asignado."
                )
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
            raise ValidationError("Debe indicar un correo o una persona licenciataria para el vinculo.")

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
                raise ValidationError("Este correo ya esta vinculado a la licencia.")

        self._sincronizar_campos_legacy()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre_asignado or self.correo_asignado} en {self.licencia}"


class ContratoCondicionEspecial(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="contrato_condiciones_especiales",
    )
    condicion = models.ForeignKey(
        "contratos.CondicionEspecial",
        on_delete=models.CASCADE,
        related_name="condicion_contratos",
        blank=True,
        null=True,
    )
    texto = models.TextField(blank=True, null=True, verbose_name="Texto de condicion personalizada")
    titulo_personalizado = models.CharField(max_length=255, blank=True, null=True)
    detalle_personalizado = models.TextField(blank=True, null=True)
    multa_incumplimiento = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Condicion Especial del Contrato"
        verbose_name_plural = "Condiciones Especiales del Contrato"

    def __str__(self):
        if self.condicion:
            return f"{self.condicion.titulo} en {self.contrato}"
        return f"Condicion personalizada en {self.contrato}"


class AcuerdoConfidencialidadContrato(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        related_name="firmas_confidencialidad",
    )
    acuerdo_base = models.ForeignKey(
        "core.AcuerdoConfidencialidadBase",
        on_delete=models.CASCADE,
        related_name="firmas",
        blank=True,
        null=True,
    )
    firma_usuario_empresa = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        related_name="firmas_confidencialidad",
        blank=True,
        null=True,
    )
    fecha_envio = models.DateTimeField(blank=True, null=True)
    fecha_firma = models.DateTimeField(blank=True, null=True)
    firmado = models.BooleanField(default=False)
    archivo_firma = models.TextField(blank=True, null=True)
    nombre_firmante = models.CharField(max_length=255, blank=True, null=True)
    correo_firmante = models.EmailField(max_length=255, blank=True, null=True)
    periodicidad_meses = models.PositiveIntegerField(blank=True, null=True)
    vigencia_desde = models.DateField(blank=True, null=True)
    vigencia_hasta = models.DateField(blank=True, null=True)

    class Meta:
        verbose_name = "Firma de Acuerdo de Confidencialidad"
        verbose_name_plural = "Firmas de Acuerdos de Confidencialidad"

    @property
    def nombre_usuario(self):
        if self.firma_usuario_empresa_id:
            return self.firma_usuario_empresa.usuario.get_nombre_completo()
        return self.nombre_firmante

    @property
    def correo_usuario(self):
        if self.firma_usuario_empresa_id:
            return self.firma_usuario_empresa.usuario.email
        return self.correo_firmante

    @property
    def es_externo(self):
        return self.firma_usuario_empresa_id is None

    def __str__(self):
        if self.acuerdo_base_id:
            return f"Firma de {self.acuerdo_base.titulo} para Contrato #{self.contrato.id}"
        return f"Firma de acuerdo para Contrato #{self.contrato.id}"


class FacturaContrato(ModeloBaseHistorico):
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
    periodo_inicio = models.DateField(help_text="Inicio del periodo de facturacion.")
    periodo_fin = models.DateField(help_text="Fin del periodo de facturacion.")
    fecha_emision = models.DateField(
        blank=True,
        null=True,
        help_text="Fecha en que se marco como 'Por facturar'.",
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
        default="USD",
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
            f"Factura #{self.pk} - {self.contrato.nombre} "
            f"({self.periodo_inicio} -> {self.periodo_fin}) [{self.get_estado_display()}]"
        )


# =====================================================================
# Sistema de Plantillas de Contrato
# =====================================================================

class PlantillaContrato(ModeloBase):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="plantillas_contrato",
    )
    titulo = models.CharField(max_length=255, verbose_name="Título de la plantilla")
    descripcion = models.TextField(blank=True, null=True)
    version = models.PositiveIntegerField(default=1)
    activa = models.BooleanField(default=True)
    tipo_contrato = models.CharField(
        max_length=20,
        choices=TIPO_CONTRATO,
        default="servicios",
    )

    es_default = models.BooleanField(
        default=False,
        verbose_name="Plantilla del sistema (no editable)",
    )

    requiere_nda = models.BooleanField(
        default=False,
        verbose_name="Requiere acuerdo de confidencialidad",
        help_text="Si se activa, el contrato derivado de esta plantilla exigira NDA antes de enviar a aprobacion.",
    )

    # ── Posición de bloques demo en el documento ──
    orden_bloque_alcance = models.PositiveIntegerField(
        default=1000,
        verbose_name="Posición del bloque de alcance",
    )
    orden_bloque_operacion = models.PositiveIntegerField(
        default=2000,
        verbose_name="Posición del bloque de operación",
    )
    orden_bloque_condiciones = models.PositiveIntegerField(
        default=3000,
        verbose_name="Posición del bloque de condiciones",
    )

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Plantilla de contrato"
        verbose_name_plural = "Plantillas de contrato"

    def __str__(self):
        return f"{self.titulo} v{self.version}"


TIPO_SECCION_CHOICES = [
    ("encabezado", "Encabezado"),
    ("clausula", "Cláusula"),
    ("condiciones_generales", "Condiciones Generales"),
    ("firmas", "Firmas"),
    ("libre", "Sección Libre"),
]

SLOT_DOCUMENTAL_CHOICES = [
    ("antes_alcance", "Antes de alcance"),
    ("entre_alcance_y_operacion", "Entre alcance y operación"),
    ("entre_operacion_y_condiciones", "Entre operación y condiciones"),
    ("despues_condiciones", "Después de condiciones"),
]

SLOT_DOCUMENTAL_ORDER = [
    "antes_alcance",
    "entre_alcance_y_operacion",
    "entre_operacion_y_condiciones",
    "despues_condiciones",
]

DEFAULT_SLOT_DOCUMENTAL = "despues_condiciones"


class SeccionPlantilla(ModeloBase):
    plantilla = models.ForeignKey(
        PlantillaContrato,
        on_delete=models.CASCADE,
        related_name="secciones",
    )
    titulo = models.CharField(max_length=255, verbose_name="Título de la sección")
    tipo = models.CharField(max_length=30, choices=TIPO_SECCION_CHOICES, default="clausula")
    contenido_template = models.TextField(
        verbose_name="Contenido con etiquetas",
        help_text="Usa [nombre_etiqueta] para insertar datos dinámicos",
    )
    orden = models.PositiveIntegerField(default=0)
    slot_documental = models.CharField(
        max_length=40,
        choices=SLOT_DOCUMENTAL_CHOICES,
        blank=True,
        null=True,
    )
    orden_en_slot = models.PositiveIntegerField(blank=True, null=True)
    es_editable_en_contrato = models.BooleanField(
        default=False,
        verbose_name="¿Editable al crear contrato?",
    )
    es_obligatoria = models.BooleanField(default=True)

    class Meta:
        ordering = ["orden"]
        verbose_name = "Sección de plantilla"
        verbose_name_plural = "Secciones de plantilla"

    def __str__(self):
        return f"{self.plantilla.titulo} → {self.titulo}"


CATEGORIA_ETIQUETA_CHOICES = [
    ("cliente", "Datos del Cliente"),
    ("proveedor", "Datos del Proveedor"),
    ("contrato", "Datos del Contrato"),
    ("servicio", "Datos del Servicio"),
    ("economico", "Datos Económicos"),
    ("custom", "Personalizada"),
]


class EtiquetaPlantilla(ModeloBase):
    empresa_prestadora = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="etiquetas_plantilla",
        null=True,
        blank=True,
    )
    clave = models.CharField(
        max_length=100,
        verbose_name="Clave de la etiqueta",
        help_text="Sin corchetes. Ej: nombre_cliente",
    )
    nombre_display = models.CharField(max_length=255, verbose_name="Nombre para mostrar")
    categoria = models.CharField(max_length=20, choices=CATEGORIA_ETIQUETA_CHOICES, default="custom")
    origen_dato = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Ruta del dato en el sistema",
        help_text="Ej: empresa_cliente.nombre, contrato.fecha_inicio. Null si es custom.",
    )
    descripcion = models.TextField(blank=True, null=True)
    valor_default = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ["categoria", "clave"]
        verbose_name = "Etiqueta de plantilla"
        verbose_name_plural = "Etiquetas de plantilla"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa_prestadora", "clave"],
                condition=models.Q(empresa_prestadora__isnull=False),
                name="unique_etiqueta_por_empresa",
            ),
            models.UniqueConstraint(
                fields=["clave"],
                condition=models.Q(empresa_prestadora__isnull=True),
                name="unique_etiqueta_global",
            ),
        ]

    def __str__(self):
        return f"[{self.clave}] — {self.nombre_display}"


class SeccionContratoGenerada(ModeloBase):
    contrato = models.ForeignKey(
        ContratoEmpresaCliente,
        on_delete=models.CASCADE,
        related_name="secciones_generadas",
    )
    seccion_plantilla = models.ForeignKey(
        SeccionPlantilla,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secciones_generadas",
    )
    titulo = models.CharField(max_length=255)
    contenido_renderizado = models.TextField(verbose_name="Texto final con etiquetas resueltas")
    orden = models.PositiveIntegerField(default=0)
    fue_editado_manualmente = models.BooleanField(default=False)

    class Meta:
        ordering = ["orden"]
        verbose_name = "Sección de contrato generada"
        verbose_name_plural = "Secciones de contrato generadas"

    def __str__(self):
        return f"{self.contrato.nombre} → {self.titulo}"
