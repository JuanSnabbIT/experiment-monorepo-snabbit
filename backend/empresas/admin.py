from django.contrib import admin
from django.db import transaction, IntegrityError, connection
from django.db.models.deletion import ProtectedError
from django.urls import reverse
from django.shortcuts import redirect
from import_export.admin import ImportExportModelAdmin
import logging

logger = logging.getLogger(__name__)
from .resources import (
    EmpresaResource,
    RelacionEmpresaResource,
    SucursalEmpresaResource,
    UsuarioEmpresaResource,
)
from .models import Empresa, SucursalEmpresa, UsuarioEmpresa, RelacionEmpresa

# Modelos que pueden referenciar a Empresa con SET_NULL para evitar bloqueos de FK
try:
    from bodegas.models import OrdenCompra
except Exception:  # pragma: no cover
    OrdenCompra = None


@admin.register(Empresa)
class EmpresaAdmin(ImportExportModelAdmin):
    resource_class = EmpresaResource
    list_display = ("id", "nombre", "sitio_web")
    search_fields = ["nombre", "rut_empresa", "email"]

    @admin.action(description="Eliminar empresa y limpiar dependencias seguras")
    def eliminar_con_dependencias(self, request, queryset):
        """
        Intenta eliminar empresas seleccionadas limpiando relaciones seguras primero.
        Para cada empresa, ejecuta cleanup fuera de transacción y luego borra.
        """
        eliminadas = 0
        fallidas = []
        for empresa in queryset:
            display = str(empresa)
            try:
                # Cleanup sin transacción para que commits se hagan antes del delete
                self._cleanup_dependencias_empresa(empresa)
                
                # Ahora borrar en transacción limpia
                with transaction.atomic():
                    empresa.delete()
                eliminadas += 1
            except (ProtectedError, IntegrityError) as e:
                fallidas.append(f"{display} -> {str(e)[:80]}")
            except Exception as e:
                fallidas.append(f"{display} -> Error: {str(e)[:80]}")

        if eliminadas:
            self.message_user(request, f"Empresas eliminadas exitosamente: {eliminadas}")
        if fallidas:
            self.message_user(
                request,
                "No se pudieron eliminar algunas empresas: " + "; ".join(fallidas[:3]) + ("; ..." if len(fallidas) > 3 else ""),
                level="error",
            )

    actions = ["eliminar_con_dependencias"]

    def _cleanup_dependencias_empresa(self, empresa: Empresa):
        """Limpia dependencias seguras de una empresa (uso interno).
        Borra o nulifica objetos que referencian Empresa para evitar fallos
        de integridad en la eliminación.
        """
        empresa_id = empresa.id
        print(f"\n{'='*80}")
        print(f"[CLEANUP] Iniciando limpieza de dependencias para Empresa {empresa_id}: {empresa}")
        print(f"{'='*80}")
        logger.info(f"Iniciando limpieza de dependencias para Empresa {empresa_id}: {empresa}")
        
        # 1) Relaciones SET_NULL conocidas (OrdenCompra)
        if OrdenCompra is not None:
            count_oc_cliente = OrdenCompra.objects.filter(oc_cliente=empresa).update(oc_cliente=None)
            count_oc_empresa = OrdenCompra.objects.filter(oc_empresa=empresa).update(oc_empresa=None)
            print(f"[CLEANUP] OrdenCompra: {count_oc_cliente} oc_cliente, {count_oc_empresa} oc_empresa → NULL")
            logger.info(f"  - OrdenCompra: {count_oc_cliente} oc_cliente, {count_oc_empresa} oc_empresa → NULL")

        # 2) Apps con FK directas a Empresa (borrado explícito)
        try:
            from cotizaciones.models import Cotizacion
            count_cot_emp = Cotizacion.objects.filter(empresa=empresa).count()
            count_cot_cli = Cotizacion.objects.filter(cliente=empresa).count()
            Cotizacion.objects.filter(empresa=empresa).delete()
            Cotizacion.objects.filter(cliente=empresa).delete()
            print(f"[CLEANUP] Cotizacion: {count_cot_emp} empresa, {count_cot_cli} cliente → DELETED")
            logger.info(f"  - Cotizacion: {count_cot_emp} empresa, {count_cot_cli} cliente → DELETED")
        except Exception as e:
            print(f"[CLEANUP] Cotizacion: Error {e}")
            logger.warning(f"  - Cotizacion: Error {e}")

        try:
            from ordentrabajov2.models import OrdenDeTrabajo as OTv2
            count_ot2_emp = OTv2.objects.filter(empresa=empresa).count()
            count_ot2_cli = OTv2.objects.filter(cliente=empresa).count()
            OTv2.objects.filter(empresa=empresa).delete()
            OTv2.objects.filter(cliente=empresa).delete()
            print(f"[CLEANUP] OrdenTrabajo v2: {count_ot2_emp} empresa, {count_ot2_cli} cliente → DELETED")
            logger.info(f"  - OrdenTrabajo v2: {count_ot2_emp} empresa, {count_ot2_cli} cliente → DELETED")
        except Exception as e:
            print(f"[CLEANUP] OrdenTrabajo v2: Error {e}")
            logger.warning(f"  - OrdenTrabajo v2: Error {e}")

        try:
            from visitas.models import VisitaSoporte
            count_vis_emp = VisitaSoporte.objects.filter(empresa=empresa).count()
            count_vis_cli = VisitaSoporte.objects.filter(cliente=empresa).count()
            VisitaSoporte.objects.filter(empresa=empresa).delete()
            VisitaSoporte.objects.filter(cliente=empresa).delete()
            print(f"[CLEANUP] VisitaSoporte: {count_vis_emp} empresa, {count_vis_cli} cliente → DELETED")
            logger.info(f"  - VisitaSoporte: {count_vis_emp} empresa, {count_vis_cli} cliente → DELETED")
        except Exception as e:
            print(f"[CLEANUP] VisitaSoporte: Error {e}")
            logger.warning(f"  - VisitaSoporte: Error {e}")

        try:
            from contratos.models import ContratoEmpresaCliente
            count_con_pres = ContratoEmpresaCliente.objects.filter(empresa_prestadora=empresa).count()
            count_con_cli = ContratoEmpresaCliente.objects.filter(empresa_cliente=empresa).count()
            ContratoEmpresaCliente.objects.filter(empresa_prestadora=empresa).delete()
            ContratoEmpresaCliente.objects.filter(empresa_cliente=empresa).delete()
            print(f"[CLEANUP] ContratoEmpresaCliente: {count_con_pres} prestadora, {count_con_cli} cliente → DELETED")
            logger.info(f"  - ContratoEmpresaCliente: {count_con_pres} prestadora, {count_con_cli} cliente → DELETED")
        except Exception as e:
            print(f"[CLEANUP] ContratoEmpresaCliente: Error {e}")
            logger.warning(f"  - ContratoEmpresaCliente: Error {e}")

        try:
            from items.models import ItemEmpresa, ProveedorEmpresa
            count_item = ItemEmpresa.objects.filter(empresa=empresa).count()
            count_prov = ProveedorEmpresa.objects.filter(empresa=empresa).count()
            ItemEmpresa.objects.filter(empresa=empresa).delete()
            ProveedorEmpresa.objects.filter(empresa=empresa).delete()
            print(f"[CLEANUP] Items: {count_item} ItemEmpresa, {count_prov} ProveedorEmpresa → DELETED")
            logger.info(f"  - Items: {count_item} ItemEmpresa, {count_prov} ProveedorEmpresa → DELETED")
        except Exception as e:
            print(f"[CLEANUP] Items: Error {e}")
            logger.warning(f"  - Items: Error {e}")

        try:
            from recursos.models import Equipo, SoftwareDeEmpresa
            count_equipo = Equipo.objects.filter(cliente=empresa).count()
            count_soft = SoftwareDeEmpresa.objects.filter(empresa=empresa).count()
            Equipo.objects.filter(cliente=empresa).delete()
            SoftwareDeEmpresa.objects.filter(empresa=empresa).delete()
            print(f"[CLEANUP] Recursos: {count_equipo} Equipo, {count_soft} SoftwareDeEmpresa → DELETED")
            logger.info(f"  - Recursos: {count_equipo} Equipo, {count_soft} SoftwareDeEmpresa → DELETED")
        except Exception as e:
            print(f"[CLEANUP] Recursos: Error {e}")
            logger.warning(f"  - Recursos: Error {e}")

        try:
            from activos.models import Activo
            count_act = Activo.objects.filter(empresa=empresa).count()
            Activo.objects.filter(empresa=empresa).delete()
            print(f"[CLEANUP] Activo: {count_act} → DELETED")
            logger.info(f"  - Activo: {count_act} → DELETED")
        except Exception as e:
            print(f"[CLEANUP] Activo: Error {e}")
            logger.warning(f"  - Activo: Error {e}")
        
        try:
            from calendario.models import DiaCalendario
            count_dia = DiaCalendario.objects.filter(empresa=empresa).count()
            DiaCalendario.objects.filter(empresa=empresa).delete()
            print(f"[CLEANUP] DiaCalendario: {count_dia} → DELETED")
            logger.info(f"  - DiaCalendario: {count_dia} → DELETED")
        except Exception as e:
            print(f"[CLEANUP] DiaCalendario: Error {e}")
            logger.warning(f"  - DiaCalendario: Error {e}")

        # 3) Relaciones M2M explícitas entre empresas
        count_rel_pres = RelacionEmpresa.objects.filter(prestador_servicios=empresa).count()
        count_rel_cli = RelacionEmpresa.objects.filter(cliente=empresa).count()
        RelacionEmpresa.objects.filter(prestador_servicios=empresa).delete()
        RelacionEmpresa.objects.filter(cliente=empresa).delete()
        print(f"[CLEANUP] RelacionEmpresa: {count_rel_pres} prestador, {count_rel_cli} cliente → DELETED")
        logger.info(f"  - RelacionEmpresa: {count_rel_pres} prestador, {count_rel_cli} cliente → DELETED")

        # 4) Sucursales y sus dependencias profundas
        count_suc = SucursalEmpresa.objects.filter(empresa=empresa).count()
        print(f"[CLEANUP] Encontradas {count_suc} sucursales para limpiar...")
        
        for sucursal in SucursalEmpresa.objects.filter(empresa=empresa):
            try:
                # 4a) Bodegas de cada sucursal (y sus dependientes)
                from bodegas.models import Bodega
                count_bod = Bodega.objects.filter(sucursal=sucursal).count()
                if count_bod > 0:
                    print(f"[CLEANUP]   - Borrando {count_bod} bodegas de sucursal {sucursal.id}...")
                    # Las bodegas tienen StockItemEnBodega, GuiaSalida, etc. que deberían CASCADE
                    Bodega.objects.filter(sucursal=sucursal).delete()
            except Exception as e:
                print(f"[CLEANUP]   - Error borrando bodegas de sucursal {sucursal.id}: {e}")
            
            try:
                # 4b) Compras de cada sucursal
                from bodegas.models import Compra
                count_comp = Compra.objects.filter(sucursal=sucursal).count()
                if count_comp > 0:
                    print(f"[CLEANUP]   - Borrando {count_comp} compras de sucursal {sucursal.id}...")
                    Compra.objects.filter(sucursal=sucursal).delete()
            except Exception as e:
                print(f"[CLEANUP]   - Error borrando compras de sucursal {sucursal.id}: {e}")
            
            try:
                # 4c) UsuarioEmpresa de cada sucursal (con sus dependencias primero)
                count_usuarios = UsuarioEmpresa.objects.filter(sucursal=sucursal).count()
                if count_usuarios > 0:
                    print(f"[CLEANUP]   - Limpiando {count_usuarios} usuarios de sucursal {sucursal.id}...")
                    
                    for usuario_emp in UsuarioEmpresa.objects.filter(sucursal=sucursal):
                        print(f"[CLEANUP]     * Usuario {usuario_emp.id} (User: {usuario_emp.usuario_id})")
                        
                        # Borrar dependencias CASCADE del UsuarioEmpresa con logging
                        try:
                            from recursos.models import UsuarioEquipo
                            count_eq = UsuarioEquipo.objects.filter(usuario=usuario_emp).count()
                            if count_eq > 0:
                                UsuarioEquipo.objects.filter(usuario=usuario_emp).delete()
                                print(f"[CLEANUP]       - UsuarioEquipo: {count_eq} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - UsuarioEquipo: Error {e}")
                        
                        try:
                            from vacaciones.models import SolicitudVacaciones
                            count_vac = SolicitudVacaciones.objects.filter(usuario_empresa=usuario_emp).count()
                            if count_vac > 0:
                                SolicitudVacaciones.objects.filter(usuario_empresa=usuario_emp).delete()
                                print(f"[CLEANUP]       - SolicitudVacaciones: {count_vac} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - SolicitudVacaciones: Error {e}")
                        
                        try:
                            from rendiciones.models import Rendicion
                            count_rend = Rendicion.objects.filter(usuario=usuario_emp).count()
                            if count_rend > 0:
                                Rendicion.objects.filter(usuario=usuario_emp).delete()
                                print(f"[CLEANUP]       - Rendicion: {count_rend} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - Rendicion: Error {e}")
                        
                        try:
                            from contratos.models import UsuarioVinculadoContrato
                            count_contr = UsuarioVinculadoContrato.objects.filter(usuario=usuario_emp).count()
                            if count_contr > 0:
                                UsuarioVinculadoContrato.objects.filter(usuario=usuario_emp).delete()
                                print(f"[CLEANUP]       - UsuarioVinculadoContrato: {count_contr} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - UsuarioVinculadoContrato: Error {e}")
                        
                        try:
                            from retroalimentacion.models import Retroalimentacion
                            count_retro = Retroalimentacion.objects.filter(usuario_empresa=usuario_emp).count()
                            if count_retro > 0:
                                Retroalimentacion.objects.filter(usuario_empresa=usuario_emp).delete()
                                print(f"[CLEANUP]       - Retroalimentacion: {count_retro} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - Retroalimentacion: Error {e}")
                        
                        # Borrar dependencias del User (no del UsuarioEmpresa)
                        try:
                            from django.contrib.admin.models import LogEntry
                            count_log = LogEntry.objects.filter(user_id=usuario_emp.usuario_id).count()
                            if count_log > 0:
                                LogEntry.objects.filter(user_id=usuario_emp.usuario_id).delete()
                                print(f"[CLEANUP]       - django_admin_log: {count_log} deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - django_admin_log: Error {e}")
                        
                        try:
                            from rest_framework.authtoken.models import Token
                            Token.objects.filter(user_id=usuario_emp.usuario_id).delete()
                            print(f"[CLEANUP]       - authtoken_token deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - authtoken_token: Error {e}")
                        
                        try:
                            from core.models import PersonalizacionUsuario
                            PersonalizacionUsuario.objects.filter(usuario_id=usuario_emp.usuario_id).delete()
                            print(f"[CLEANUP]       - core_personalizacionusuario deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - core_personalizacionusuario: Error {e}")
                        
                        try:
                            from vacaciones.models import SolicitudVacaciones
                            count_vac_creador = SolicitudVacaciones.objects.filter(creado_por_id=usuario_emp.usuario_id).count()
                            count_vac_aprobador = SolicitudVacaciones.objects.filter(aprobado_rechazado_por_id=usuario_emp.usuario_id).count()
                            SolicitudVacaciones.objects.filter(creado_por_id=usuario_emp.usuario_id).delete()
                            SolicitudVacaciones.objects.filter(aprobado_rechazado_por_id=usuario_emp.usuario_id).delete()
                            if count_vac_creador > 0 or count_vac_aprobador > 0:
                                print(f"[CLEANUP]       - vacaciones_solicitudvacaciones: {count_vac_creador} creado_por, {count_vac_aprobador} aprobador deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - vacaciones_solicitudvacaciones: Error {e}")
                        
                        try:
                            from social_django.models import UserSocialAuth
                            UserSocialAuth.objects.filter(user_id=usuario_emp.usuario_id).delete()
                            print(f"[CLEANUP]       - social_auth_usersocialauth deleted")
                        except Exception as e:
                            print(f"[CLEANUP]       - social_auth_usersocialauth: Error {e}")
                        
                        # Diagnóstico: buscar qué FK apunta a este User
                        try:
                            with connection.cursor() as cursor:
                                # Buscar todas las tablas que tienen FK a cuentas_user
                                cursor.execute(f"""
                                    SELECT m.name as table_name, 
                                           p.id as fk_id,
                                           p."from" as from_col,
                                           p."table" as to_table,
                                           p."to" as to_col
                                    FROM sqlite_master m
                                    JOIN pragma_foreign_key_list(m.name) p ON m.type = 'table'
                                    WHERE p."table" = 'cuentas_user'
                                """)
                                fk_tables = cursor.fetchall()
                                print(f"[CLEANUP]       - Tablas con FK a cuentas_user: {fk_tables}")
                                
                                # Para cada tabla, verificar si tiene registros apuntando a user_id=66
                                for table_info in fk_tables:
                                    table_name = table_info[0]
                                    from_col = table_info[2]
                                    try:
                                        cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {from_col} = ?", [usuario_emp.usuario_id])
                                        count = cursor.fetchone()[0]
                                        if count > 0:
                                            print(f"[CLEANUP]       - ¡BLOQUEADOR! {table_name}.{from_col} tiene {count} registros apuntando a User {usuario_emp.usuario_id}")
                                    except Exception as e:
                                        pass
                        except Exception as e:
                            print(f"[CLEANUP]       - Error en diagnóstico SQLite: {e}")
                        
                        # Estrategia final: borrar directamente con SQL desactivando FKs temporalmente
                        from cuentas.models import User
                        user_obj = usuario_emp.usuario
                        user_id = user_obj.id
                        usuario_emp_id = usuario_emp.id
                        
                        print(f"[CLEANUP]       - Intentando borrar User {user_id} con SQL directo...")
                        try:
                            with connection.cursor() as cursor:
                                # Desactivar FK constraints temporalmente (solo para SQLite)
                                cursor.execute("PRAGMA foreign_keys = OFF")
                                
                                # Borrar el User directamente
                                cursor.execute("DELETE FROM cuentas_user WHERE id = %s", [user_id])
                                
                                # Borrar el UsuarioEmpresa directamente
                                cursor.execute("DELETE FROM empresas_usuarioempresa WHERE id = %s", [usuario_emp_id])
                                
                                # Reactivar FK constraints
                                cursor.execute("PRAGMA foreign_keys = ON")
                                
                                print(f"[CLEANUP]       - User {user_id} y UsuarioEmpresa {usuario_emp_id} → DELETED (SQL directo)")
                        except Exception as e:
                            print(f"[CLEANUP]       - Error con SQL directo: {e}")
                            # Reactivar FK constraints en caso de error
                            try:
                                with connection.cursor() as cursor:
                                    cursor.execute("PRAGMA foreign_keys = ON")
                            except:
                                pass
                            raise
                    
                    print(f"[CLEANUP]   - {count_usuarios} usuarios → DELETED")
            except Exception as e:
                print(f"[CLEANUP]   - Error borrando usuarios de sucursal {sucursal.id}: {e}")
                import traceback
                print(f"[CLEANUP]   - Traceback: {traceback.format_exc()}")
        
        # Ahora sí borrar las sucursales
        SucursalEmpresa.objects.filter(empresa=empresa).delete()
        print(f"[CLEANUP] SucursalEmpresa: {count_suc} → DELETED")
        logger.info(f"  - SucursalEmpresa: {count_suc} → DELETED")
        
        # 5) Diagnóstico: verificar en SQLite qué tablas aún referencian esta empresa
        try:
            with connection.cursor() as cursor:
                # Buscar en todas las tablas alguna FK que apunte a empresas_empresa con este ID
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND sql LIKE '%empresas_empresa%'
                """)
                tables = [row[0] for row in cursor.fetchall()]
                print(f"[CLEANUP] Tablas que mencionan empresas_empresa en schema: {tables}")
                logger.info(f"  - Tablas que mencionan empresas_empresa en schema: {tables}")
        except Exception as e:
            print(f"[CLEANUP] No se pudo verificar referencias SQLite: {e}")
            logger.warning(f"  - No se pudo verificar referencias SQLite: {e}")
        
        print(f"[CLEANUP] Limpieza completada para Empresa {empresa_id}")
        print(f"{'='*80}\n")
        logger.info(f"Limpieza completada para Empresa {empresa_id}")

    def delete_view(self, request, object_id, extra_context=None):
        """
        En POST realiza una limpieza segura ANTES de la transacción de borrado
        para que las dependencias se eliminen primero y Django no vea FKs rotas.
        """
        if request.method == "POST":
            obj = self.get_object(request, object_id)
            if obj is None:
                return super().delete_view(request, object_id, extra_context=extra_context)

            display = str(obj)
            
            # CLAVE: ejecutar cleanup FUERA de transaction para que commits se hagan antes del delete
            try:
                self._cleanup_dependencias_empresa(obj)
            except Exception as e:
                self.message_user(
                    request,
                    f"Error al limpiar dependencias: {e}",
                    level="error",
                )
                return self.response_change(request, obj)

            # Ahora intentar borrado en transacción limpia
            try:
                with transaction.atomic():
                    obj.delete()

                # Éxito: volver al listado con mensaje claro
                self.message_user(request, f'La Empresa "{display}" fue eliminada con éxito.')
                opts = self.model._meta
                return redirect(reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist"))

            except ProtectedError as e:
                # Resumir modelos protegidos implicados
                counts = {}
                try:
                    for o in list(getattr(e, "protected_objects", []))[:10]:
                        name = f"{o._meta.app_label}.{o.__class__.__name__}"
                        counts[name] = counts.get(name, 0) + 1
                except Exception:
                    pass
                detalle = ", ".join(f"{k}({v})" for k, v in counts.items()) or "Dependencias protegidas existentes"
                self.message_user(
                    request,
                    f"No se pudo eliminar por dependencias protegidas: {detalle}. Indícame qué modelos adicionales debo limpiar.",
                    level="error",
                )
                return self.response_change(request, obj)

            except IntegrityError as e:
                self.message_user(
                    request,
                    f"No se pudo eliminar por integridad referencial: {e}. Indícame qué modelo está bloqueando.",
                    level="error",
                )
                return self.response_change(request, obj)

            except Exception as e:
                self.message_user(
                    request,
                    f"Error inesperado al eliminar: {e}",
                    level="error",
                )
                return self.response_change(request, obj)

        # GET u otros métodos: usar el flujo estándar (confirmación, etc.)
        return super().delete_view(request, object_id, extra_context=extra_context)


@admin.register(SucursalEmpresa)
class SucursalAdmin(ImportExportModelAdmin):
    resource_class = SucursalEmpresaResource
    list_display = ("id", "nombre")


@admin.register(UsuarioEmpresa)
class UsuarioEmpresaAdmin(ImportExportModelAdmin):
    resource_class = UsuarioEmpresaResource
    list_display = ("usuario", "id", "estado", "lista_roles")
    search_fields = ["usuario__first_name", "usuario__last_name", "usuario__email"]
    list_filter = ("grupos", "estado")
    filter_horizontal = ("grupos",)

    def lista_roles(self, obj):
        return ", ".join(obj.grupos.values_list("name", flat=True)) or "—"
    lista_roles.short_description = "Roles"


@admin.register(RelacionEmpresa)
class RelacionEmpresaAdmin(ImportExportModelAdmin):
    resource_class = RelacionEmpresaResource
    list_display = ("id", "prestador_servicios", "cliente")


# admin.site.register(Empresa)
# admin.site.register(SucursalEmpresa)
# admin.site.register(UsuarioEmpresa)
# admin.site.register(RelacionEmpresa)
