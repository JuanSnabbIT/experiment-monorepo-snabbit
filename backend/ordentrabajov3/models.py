from django.db import models
from core.models import ModeloBase, ModeloBaseHistorico
from .estados_modelo import (
    ESTADOS_OT_V3, ESTADO_BORRADOR,
    ESTADOS_TAREA_V3, ESTADO_TAREA_PENDIENTE,
    MODALIDADES_OT_V3, MODALIDAD_PRESENCIAL,
    TIPOS_SERVICIO_OT_V3, TIPO_SERVICIO_SOPORTE_PRESENCIAL,
    PRIORIDADES_OT_V3, PRIORIDAD_NORMAL,
    ROLES_ASIGNACION, ROL_APOYO,
    TIPOS_SEGUIMIENTO, TIPO_SEG_COMENTARIO_TECNICO,
    TIPOS_CHECKLIST, TIPO_CHECKLIST_PRE,
    TIPOS_ADJUNTO, TIPO_ADJUNTO_FOTO,
)


class OrdenDeTrabajoV3(ModeloBaseHistorico):
    """
    Orden de trabajo version 3.
    Clasificada por modalidad (presencial/remoto/hibrido) en lugar de tipo_servicio.
    Flujo de estados: borrador -> preparacion -> en_ejecucion -> retroalimentacion -> por_facturar -> facturada -> cerrada
    """
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.PROTECT,
        related_name="ots_v3",
        verbose_name="Empresa",
    )
    sucursal = models.ForeignKey(
        "empresas.SucursalEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ots_v3",
        verbose_name="Sucursal",
    )
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.PROTECT,
        related_name="ots_v3_como_cliente",
        verbose_name="Cliente",
    )
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ots_v3",
        verbose_name="Contrato vinculado",
    )
    cotizaciones = models.ManyToManyField(
        "cotizaciones.Cotizacion",
        blank=True,
        related_name="ots_v3",
        verbose_name="Cotizaciones vinculadas",
    )
    guias_salida = models.ManyToManyField(
        "bodegas.GuiaSalida",
        blank=True,
        related_name="ots_v3",
        verbose_name="Guias de salida vinculadas",
    )
    ordenes_compra = models.ManyToManyField(
        "bodegas.OrdenCompra",
        blank=True,
        related_name="ots_v3",
        verbose_name="Ordenes de compra vinculadas",
    )
    titulo = models.CharField(max_length=255, verbose_name="Titulo")
    descripcion = models.TextField(blank=True, default="", verbose_name="Descripcion")
    tipo_servicio = models.CharField(
        max_length=40,
        choices=TIPOS_SERVICIO_OT_V3,
        default=TIPO_SERVICIO_SOPORTE_PRESENCIAL,
        verbose_name="Tipo de servicio",
    )
    modalidad = models.CharField(
        max_length=20,
        choices=MODALIDADES_OT_V3,
        default=MODALIDAD_PRESENCIAL,
        verbose_name="Modalidad",
    )
    estado = models.CharField(
        max_length=30,
        choices=ESTADOS_OT_V3,
        default=ESTADO_BORRADOR,
        verbose_name="Estado",
    )
    prioridad = models.CharField(
        max_length=10,
        choices=PRIORIDADES_OT_V3,
        default=PRIORIDAD_NORMAL,
        verbose_name="Prioridad",
    )
    tecnico_responsable = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ots_v3_responsable",
        verbose_name="Tecnico responsable",
    )
    cliente_solicitante = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ots_v3_solicitadas",
        verbose_name="Contacto solicitante en cliente",
    )
    fecha_programada = models.DateTimeField(null=True, blank=True, verbose_name="Fecha programada")
    fecha_fin_estimada = models.DateField(null=True, blank=True, verbose_name="Fecha fin estimada")
    fecha_inicio_real = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de inicio real")
    fecha_finalizacion_real = models.DateTimeField(null=True, blank=True, verbose_name="Fecha finalizacion real")
    direccion = models.TextField(blank=True, default="", verbose_name="Direccion (trabajo presencial)")
    notas_internas = models.TextField(blank=True, default="", verbose_name="Notas internas")

    class Meta:
        verbose_name = "Orden de Trabajo V3"
        verbose_name_plural = "Ordenes de Trabajo V3"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"OT-V3-{self.pk} | {self.titulo}"

    def get_estado_display_label(self):
        return dict(ESTADOS_OT_V3).get(self.estado, self.estado)

    def get_modalidad_display_label(self):
        return dict(MODALIDADES_OT_V3).get(self.modalidad, self.modalidad)

    def get_etapa_ui(self):
        from .estados_modelo import ETAPA_UI_MAP
        return ETAPA_UI_MAP.get(self.estado, "preparacion")


class TareaOTV3(ModeloBase):
    """
    Tarea dentro de una OT V3. Unifica soporte tecnico y servicio general de v2.
    Una OT puede tener multiples tareas que el tecnico debe ejecutar.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="tareas",
        verbose_name="Orden de trabajo",
    )
    titulo = models.CharField(max_length=255, verbose_name="Titulo")
    descripcion = models.TextField(blank=True, default="", verbose_name="Descripcion")
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_TAREA_V3,
        default=ESTADO_TAREA_PENDIENTE,
        verbose_name="Estado",
    )
    tecnico_asignado = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tareas_v3_asignadas",
        verbose_name="Tecnico asignado",
    )
    fecha_programada = models.DateTimeField(null=True, blank=True, verbose_name="Fecha programada")
    fecha_ejecutada = models.DateTimeField(null=True, blank=True, verbose_name="Fecha ejecutada")
    notas_ejecucion = models.TextField(blank=True, default="", verbose_name="Notas de ejecucion")
    requiere_firma = models.BooleanField(default=False, verbose_name="Requiere firma al completar")
    firma_datos = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Datos de firma (JSON: nombre, firma_base64, fecha)",
    )
    tipo_tarea = models.CharField(
        max_length=20,
        choices=[("regular", "Regular"), ("entrega_equipo", "Entrega de equipo")],
        default="regular",
        verbose_name="Tipo de tarea",
    )
    usuario_receptor = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tareas_v3_receptor",
        verbose_name="Usuario receptor del equipo",
    )
    item_guia_origen = models.ForeignKey(
        "bodegas.ItemsGuiaSalida",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tareas_otv3",
        verbose_name="Item de guia de salida origen",
    )

    class Meta:
        verbose_name = "Tarea OT V3"
        verbose_name_plural = "Tareas OT V3"
        ordering = ["fecha_creacion"]

    def __str__(self):
        return f"Tarea: {self.titulo} | OT #{self.orden_id}"


class AsignacionTecnicoOTV3(ModeloBase):
    """
    Tecnico o usuario del equipo asignado a una OT V3.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="asignaciones",
        verbose_name="Orden de trabajo",
    )
    tecnico = models.ForeignKey(
        "cuentas.User",
        on_delete=models.CASCADE,
        related_name="asignaciones_ot_v3",
        verbose_name="Tecnico",
    )
    rol = models.CharField(
        max_length=20,
        choices=ROLES_ASIGNACION,
        default=ROL_APOYO,
        verbose_name="Rol en la OT",
    )
    confirmado = models.BooleanField(default=False, verbose_name="Asignacion confirmada")

    class Meta:
        verbose_name = "Asignacion Tecnico OT V3"
        verbose_name_plural = "Asignaciones Tecnico OT V3"
        unique_together = [("orden", "tecnico")]

    def __str__(self):
        return f"{self.tecnico} ({self.get_rol_display()}) | OT #{self.orden_id}"


class ChecklistItemOTV3(ModeloBase):
    """
    Item de checklist asociado a una tarea. Puede ser pre o post trabajo.
    Soporta escenarios de instalacion y configuracion con pasos verificables.
    """
    tarea = models.ForeignKey(
        TareaOTV3,
        on_delete=models.CASCADE,
        related_name="checklist",
        verbose_name="Tarea",
    )
    tipo = models.CharField(
        max_length=15,
        choices=TIPOS_CHECKLIST,
        default=TIPO_CHECKLIST_PRE,
        verbose_name="Tipo (pre/post trabajo)",
    )
    descripcion = models.CharField(max_length=500, verbose_name="Descripcion del item")
    completado = models.BooleanField(default=False, verbose_name="Completado")
    completado_por = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checklist_items_completados_v3",
        verbose_name="Completado por",
    )
    fecha_completado = models.DateTimeField(null=True, blank=True, verbose_name="Fecha completado")

    class Meta:
        verbose_name = "Checklist Item OT V3"
        verbose_name_plural = "Checklist Items OT V3"
        ordering = ["tipo", "fecha_creacion"]

    def __str__(self):
        estado = "[x]" if self.completado else "[ ]"
        return f"{estado} {self.descripcion} ({self.get_tipo_display()})"


class SeguimientoOTV3(ModeloBase):
    """
    Comentario o nota de seguimiento sobre una OT o una tarea especifica.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="seguimientos",
        verbose_name="Orden de trabajo",
    )
    tarea = models.ForeignKey(
        TareaOTV3,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="seguimientos",
        verbose_name="Tarea (opcional)",
    )
    tipo = models.CharField(
        max_length=30,
        choices=TIPOS_SEGUIMIENTO,
        default=TIPO_SEG_COMENTARIO_TECNICO,
        verbose_name="Tipo de seguimiento",
    )
    contenido = models.TextField(verbose_name="Contenido")
    autor = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="seguimientos_ot_v3",
        verbose_name="Autor",
    )

    class Meta:
        verbose_name = "Seguimiento OT V3"
        verbose_name_plural = "Seguimientos OT V3"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.get_tipo_display()} | OT #{self.orden_id}"


class GastoOTV3(ModeloBase):
    """
    Gasto operativo registrado durante la ejecucion de una OT.
    Reutiliza CategoriaGastoRendicion del modulo rendiciones.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="gastos",
        verbose_name="Orden de trabajo",
    )
    tarea = models.ForeignKey(
        TareaOTV3,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gastos",
        verbose_name="Tarea relacionada (opcional)",
    )
    categoria = models.ForeignKey(
        "rendiciones.CategoriaGastoRendicion",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="gastos_ot_v3",
        verbose_name="Categoria",
    )
    detalle = models.CharField(max_length=500, verbose_name="Detalle del gasto")
    cantidad = models.PositiveIntegerField(default=1, verbose_name="Cantidad")
    monto_unitario = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Monto unitario")
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Monto total")
    comprobante = models.FileField(
        upload_to="gastos_ot_v3/",
        null=True,
        blank=True,
        verbose_name="Comprobante",
    )
    usuario_comprador = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="gastos_ot_v3_registrados",
        verbose_name="Usuario comprador",
    )
    fecha_compra = models.DateField(null=True, blank=True, verbose_name="Fecha de compra")

    class Meta:
        verbose_name = "Gasto OT V3"
        verbose_name_plural = "Gastos OT V3"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.detalle} | ${self.monto_total} | OT #{self.orden_id}"

    def save(self, *args, **kwargs):
        self.monto_total = self.cantidad * self.monto_unitario
        super().save(*args, **kwargs)


class AdjuntoOTV3(ModeloBase):
    """
    Archivo adjunto o foto vinculado a una OT o tarea especifica.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="adjuntos",
        verbose_name="Orden de trabajo",
    )
    tarea = models.ForeignKey(
        TareaOTV3,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="adjuntos",
        verbose_name="Tarea relacionada (opcional)",
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPOS_ADJUNTO,
        default=TIPO_ADJUNTO_FOTO,
        verbose_name="Tipo de adjunto",
    )
    archivo = models.FileField(upload_to="adjuntos_ot_v3/", verbose_name="Archivo")
    descripcion = models.CharField(max_length=500, blank=True, default="", verbose_name="Descripcion")
    subido_por = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="adjuntos_ot_v3_subidos",
        verbose_name="Subido por",
    )

    class Meta:
        verbose_name = "Adjunto OT V3"
        verbose_name_plural = "Adjuntos OT V3"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.get_tipo_display()} | {self.archivo.name} | OT #{self.orden_id}"


class HistorialEstadoOTV3(ModeloBase):
    """
    Registro auditado de cada transicion de estado de una OT V3.
    Se crea automaticamente via signal al guardar OrdenDeTrabajoV3.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="historial_estados",
        verbose_name="Orden de trabajo",
    )
    estado_anterior = models.CharField(max_length=30, blank=True, default="", verbose_name="Estado anterior")
    estado_nuevo = models.CharField(max_length=30, verbose_name="Estado nuevo")
    comentario = models.TextField(blank=True, default="", verbose_name="Comentario")
    usuario = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historial_estados_ot_v3",
        verbose_name="Usuario que realizo el cambio",
    )

    class Meta:
        verbose_name = "Historial Estado OT V3"
        verbose_name_plural = "Historial Estados OT V3"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"OT #{self.orden_id}: {self.estado_anterior} -> {self.estado_nuevo}"


def documentos_factura_otv3(instance, filename):
    return "prefacturas_otv3/{0}/documentos/{1}".format(instance.pk, filename)


ESTADOS_CIERRE_OTV3 = [
    ("borrador", "Borrador"),
    ("por_facturar", "Por facturar"),
    ("facturado", "Facturado"),
]

MONEDAS_PREFACTURA_OTV3 = [
    ("CLP", "Pesos chilenos"),
    ("USD", "Dolar estadounidense"),
    ("UF", "Unidad de fomento"),
]


class PrefacturaOTV3(ModeloBaseHistorico):
    """
    Prefactura (cierre administrativo) para facturacion de una o varias OTs V3.
    Flujo: borrador -> por_facturar -> facturado
    """

    ot = models.OneToOneField(
        OrdenDeTrabajoV3,
        on_delete=models.CASCADE,
        related_name="prefactura",
        verbose_name="Orden de trabajo V3 (legacy, usar ots)",
        null=True,
        blank=True,
    )
    ots = models.ManyToManyField(
        OrdenDeTrabajoV3,
        blank=True,
        related_name="prefacturas",
        verbose_name="Ordenes de trabajo V3 incluidas",
    )
    contratos = models.ManyToManyField(
        "contratos.ContratoEmpresaCliente",
        blank=True,
        related_name="prefacturas_otv3",
        verbose_name="Contratos vinculados",
    )
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.PROTECT,
        related_name="prefacturas_otv3",
        verbose_name="Cliente",
    )
    estado_cierre = models.CharField(
        max_length=20,
        choices=ESTADOS_CIERRE_OTV3,
        default="borrador",
        verbose_name="Estado de prefactura",
    )
    moneda_prefactura = models.CharField(
        max_length=3,
        choices=MONEDAS_PREFACTURA_OTV3,
        default="CLP",
        verbose_name="Moneda de emision de prefactura",
    )
    resultado = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Resultado prefactura",
        help_text="Snapshot minimo util para facturacion (items/totales/referencias).",
    )
    fecha_prefactura = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha definida en prefactura",
    )
    documento_factura = models.FileField(
        upload_to=documentos_factura_otv3,
        null=True,
        blank=True,
        verbose_name="Documento de factura asociado",
    )
    comentario = models.TextField(
        blank=True,
        default="",
        verbose_name="Comentario interno",
    )
    tasa_dolar_usada = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Tasa dólar usada en prefactura",
    )
    tasa_uf_usada = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Tasa UF usada en prefactura",
    )
    fecha_tasa_cambio = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de la tasa de cambio aplicada",
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prefacturas_otv3_creadas",
        verbose_name="Creado por",
    )
    actualizado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prefacturas_otv3_actualizadas",
        verbose_name="Actualizado por",
    )

    class Meta:
        verbose_name = "Prefactura OT V3"
        verbose_name_plural = "Prefacturas OT V3"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["cliente", "estado_cierre"]),
            models.Index(fields=["estado_cierre"]),
            models.Index(fields=["-fecha_creacion"]),
        ]

    def __str__(self):
        ot_ref = f"OT #{self.ot_id}" if self.ot_id else f"{self.ots.count()} OTs"
        return f"Prefactura OTV3 #{self.pk} - {ot_ref} - {self.estado_cierre}"
