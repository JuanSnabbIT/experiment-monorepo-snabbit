from django.contrib import admin
from django.contrib.contenttypes.models import ContentType
from .forms import ContratoServicioForm, UsuarioVinculadoLicenciaForm
from empresas.models import UsuarioEmpresa
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoFirmaUsuario,
    UsuarioVinculadoContrato,
    PlanServicioDetalle,
    ContratoServicio,
    ContratoItemComercial,
    ContratoVisita,
    ContratoLicencia,
    UsuarioVinculadoLicencia,
    ContratoCondicionEspecial,
    Servicio,
    PlanServicio,
    Visita,
    Licencia,
    CondicionEspecial,
    CaracteristicaServicio,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    AcuerdoConfidencialidadContrato,
    FacturaContrato,
    PlantillaContrato,
    SeccionPlantilla,
    EtiquetaPlantilla,
    SeccionContratoGenerada,
)


# ---------- Inlines for ContratoEmpresaCliente ----------
class UsuarioVinculadoContratoInline(admin.TabularInline):
    model = UsuarioVinculadoContrato
    extra = 0
    fields = ['usuario', 'tipo_usuario', 'fecha_vinculacion']
    readonly_fields = ['fecha_vinculacion']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'usuario':
            contrato_id = request.resolver_match.kwargs.get('object_id')
            if contrato_id:
                try:
                    contrato = ContratoEmpresaCliente.objects.get(pk=contrato_id)
                    kwargs['queryset'] = UsuarioEmpresa.objects.filter(
                        sucursal__empresa=contrato.empresa_cliente
                    )
                except ContratoEmpresaCliente.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ContratoServicioInline(admin.TabularInline):
    model = ContratoServicio
    form = ContratoServicioForm
    extra = 1
    fields = ['servicio_plan', 'cantidad', 'precio_unitario']
    verbose_name = 'Servicio o Plan'
    verbose_name_plural = 'Servicios o Planes'


class ContratoVisitaInline(admin.TabularInline):
    model = ContratoVisita
    extra = 1
    fields = ['visita', 'frecuencia', 'cantidad']


class ContratoItemComercialInline(admin.TabularInline):
    model = ContratoItemComercial
    extra = 0
    fields = [
        'tipo_origen',
        'snapshot_nombre',
        'cantidad',
        'num_visitas_mensuales',
        'snapshot_num_visitas_mensuales',
    ]
    readonly_fields = ['snapshot_nombre']


class ContratoLicenciaInline(admin.TabularInline):
    model = ContratoLicencia
    extra = 1
    fields = [
        'licencia', 'modalidad_snapshot',
        'cantidad', 'precio_unitario_snapshot', 'moneda_snapshot',
        'fecha_inicio', 'fecha_fin', 'partner'
    ]
    readonly_fields = ['modalidad_snapshot', 'precio_unitario_snapshot', 'moneda_snapshot']


class ContratoCondicionEspecialInline(admin.TabularInline):
    model = ContratoCondicionEspecial
    extra = 1
    fields = ['condicion']


class AcuerdoConfidencialidadContratoInline(admin.TabularInline):
    model = AcuerdoConfidencialidadContrato
    extra = 0
    fields = ['acuerdo_base']


class PlanServicioDetalleInline(admin.TabularInline):
    model = PlanServicioDetalle
    extra = 1
    fields = [
        'servicio_version',
        'orden',
        'obligatorio',
        'cantidad_default',
        'veces_por_mes_default',
    ]


# ---------- ContratoEmpresaCliente Admin ----------
@admin.register(ContratoEmpresaCliente)
class ContratoEmpresaClienteAdmin(admin.ModelAdmin):
    list_display = (
        'nombre', 'empresa_prestadora', 'empresa_cliente',
        'tipo', 'fecha_inicio', 'fecha_fin', 'estado'
    )
    list_filter = ('estado', 'tipo', 'empresa_prestadora', 'empresa_cliente')
    search_fields = ('nombre',
                     'empresa_prestadora__nombre',
                     'empresa_cliente__nombre')
    ordering = ('-fecha_inicio',)
    date_hierarchy = 'fecha_inicio'
    inlines = [
        UsuarioVinculadoContratoInline,
        ContratoServicioInline,
        ContratoItemComercialInline,
        ContratoVisitaInline,
        ContratoLicenciaInline,
        ContratoCondicionEspecialInline,
        AcuerdoConfidencialidadContratoInline
    ]
    actions = ['marcar_como_finalizado']

    def marcar_como_finalizado(self, request, queryset):
        count = queryset.update(estado='finalizado')
        self.message_user(request, f"{count} contratos marcados como finalizado.")
    marcar_como_finalizado.short_description = 'Marcar como finalizado'


# ---------- ContratoLicencia Admin ----------
class UsuarioVinculadoLicenciaInline(admin.TabularInline):
    model = UsuarioVinculadoLicencia
    form = UsuarioVinculadoLicenciaForm
    extra = 1
    fields = ['usuario', 'correo_persona', 'nombre', 'correo_generico', 'fecha_asignacion']
    readonly_fields = ['fecha_asignacion']
    raw_id_fields = ['usuario', 'correo_persona']

@admin.register(ContratoLicencia)
class ContratoLicenciaAdmin(admin.ModelAdmin):
    list_display = (
        'contrato', 'licencia', 'modalidad_snapshot', 'cantidad',
        'fecha_inicio', 'fecha_fin', 'partner'
    )
    list_filter = ('modalidad_snapshot', 'partner')
    search_fields = (
        'contrato__nombre',
        'contrato__empresa_cliente__nombre',
        'licencia__nombre'
    )
    ordering = ('-fecha_inicio',)
    inlines = [UsuarioVinculadoLicenciaInline]
    raw_id_fields = ['licencia', 'contrato']


# ---------- Other Models Admin ----------
@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'descripcion')
    search_fields = ('nombre',)
    filter_horizontal = ('caracteristicas',)


@admin.register(PlanServicio)
class PlanServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)
    inlines = [PlanServicioDetalleInline]


@admin.register(Visita)
class VisitaAdmin(admin.ModelAdmin):
    list_display = ('descripcion',)
    search_fields = ('descripcion',)


@admin.register(Licencia)
class LicenciaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proveedor', 'moneda', 'precio_venta', 'activo')
    search_fields = ('nombre', 'proveedor')
    list_filter = ('activo', 'moneda')


@admin.register(CondicionEspecial)
class CondicionEspecialAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'descripcion')
    search_fields = ('titulo',)


@admin.register(CaracteristicaServicio)
class CaracteristicaServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)


@admin.register(ContratoServicio)
class ContratoServicioAdmin(admin.ModelAdmin):
    list_display = ('contrato', 'content_type', 'object_id', 'cantidad')
    list_filter = ('content_type',)
    search_fields = ('contrato__nombre',)
    raw_id_fields = ['content_type']


@admin.register(ContratoItemComercial)
class ContratoItemComercialAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'contrato',
        'tipo_origen',
        'snapshot_nombre',
        'cantidad',
        'num_visitas_mensuales',
        'snapshot_num_visitas_mensuales',
    )
    list_filter = (
        'tipo_origen',
        'contrato__estado',
        'contrato__empresa_cliente',
        'contrato__empresa_prestadora',
    )
    search_fields = (
        'contrato__nombre',
        'contrato__empresa_cliente__nombre',
        'snapshot_nombre',
    )
    raw_id_fields = ('contrato', 'plan_version', 'servicio_version')


@admin.register(ContratoVisita)
class ContratoVisitaAdmin(admin.ModelAdmin):
    list_display = ('contrato', 'visita', 'frecuencia', 'cantidad')
    list_filter = ('frecuencia',)
    search_fields = ('visita__descripcion',)


@admin.register(UsuarioVinculadoContrato)
class UsuarioVinculadoContratoAdmin(admin.ModelAdmin):
    list_display = ('contrato', 'usuario', 'tipo_usuario', 'fecha_vinculacion')
    list_filter = ('tipo_usuario',)
    search_fields = ('usuario__username',)


@admin.register(UsuarioVinculadoLicencia)
class UsuarioVinculadoLicenciaAdmin(admin.ModelAdmin):
    form = UsuarioVinculadoLicenciaForm
    list_display = ('licencia', 'correo_persona', 'usuario', 'fecha_asignacion')
    list_filter = ('fecha_asignacion',)
    search_fields = ('usuario__usuario__email', 'correo_persona__correo', 'nombre')


@admin.register(PersonaLicenciataria)
class PersonaLicenciatariaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'usuario_empresa', 'es_interno', 'activo')
    list_filter = ('empresa', 'es_interno', 'activo')
    search_fields = ('nombre', 'usuario_empresa__usuario__email')
    raw_id_fields = ('empresa', 'usuario_empresa')


@admin.register(CorreoPersonaLicenciataria)
class CorreoPersonaLicenciatariaAdmin(admin.ModelAdmin):
    list_display = ('correo', 'persona', 'empresa', 'es_principal', 'activo')
    list_filter = ('empresa', 'es_principal', 'es_corporativo', 'activo')
    search_fields = ('correo', 'persona__nombre')
    raw_id_fields = ('persona', 'empresa')


@admin.register(ContratoCondicionEspecial)
class ContratoCondicionEspecialAdmin(admin.ModelAdmin):
    list_display = ('contrato', 'condicion')
    list_filter = ('condicion',)
    search_fields = ('condicion__titulo',)


@admin.register(AcuerdoConfidencialidadContrato)
class AcuerdoConfidencialidadContratoAdmin(admin.ModelAdmin):
    list_display = ('contrato', 'acuerdo_base')
    search_fields = ('contrato__nombre',)


# Register ContentType for GenericForeignKey usage
@admin.register(ContentType)
class ContentTypeAdmin(admin.ModelAdmin):
    search_fields = ('model',)

admin.site.register(EnvioContratoFirmaUsuario)


@admin.register(FacturaContrato)
class FacturaContratoAdmin(admin.ModelAdmin):
    list_display = ('id', 'contrato', 'empresa_cliente', 'estado', 'periodo_inicio', 'periodo_fin', 'monto_total')
    list_filter = ('estado', 'moneda', 'periodo_inicio')
    search_fields = ('contrato__nombre', 'empresa_cliente__nombre')
    readonly_fields = ('fecha_creacion', 'fecha_modificacion')
    raw_id_fields = ('contrato', 'empresa_prestadora', 'empresa_cliente', 'creado_por', 'actualizado_por')


# ---------- Sistema de Plantillas ----------
class SeccionPlantillaInline(admin.TabularInline):
    model = SeccionPlantilla
    extra = 1


@admin.register(PlantillaContrato)
class PlantillaContratoAdmin(admin.ModelAdmin):
    list_display = ["titulo", "version", "activa", "tipo_contrato", "empresa_prestadora"]
    inlines = [SeccionPlantillaInline]


@admin.register(EtiquetaPlantilla)
class EtiquetaPlantillaAdmin(admin.ModelAdmin):
    list_display = ["clave", "nombre_display", "categoria", "empresa_prestadora"]
    list_filter = ["categoria"]


@admin.register(SeccionContratoGenerada)
class SeccionContratoGeneradaAdmin(admin.ModelAdmin):
    list_display = ["contrato", "titulo", "orden", "fue_editado_manualmente"]
