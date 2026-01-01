"""
Script para crear datos de prueba completos para el módulo de Orden de Trabajo
Incluye todas las relaciones: usuarios, detalles, seguimientos, historial, adjuntos y gastos
"""

import os
import sys
import django
from datetime import date, datetime, timedelta
from decimal import Decimal

# Configurar Django
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.db import transaction
from cuentas.models import User
from empresas.models import Empresa, UsuarioEmpresa
from ordentrabajo.models import (
    OrdenDeTrabajo, UsuarioAsignadoOT, DetalleTrabajo,
    SeguimientoDetalleTrabajo, HistorialCambiosOrden,
    AdjuntoDeOrden, DetalleGastoRendicionOT
)
from rendiciones.models import CategoriaGastoRendicion


def obtener_o_crear_usuarios():
    """Obtiene o crea usuarios de prueba"""
    print("📋 Verificando usuarios...")
    
    # Obtener empresas
    try:
        empresa_prestadora = Empresa.objects.get(nombre="Snabbit")
        empresa_cliente = Empresa.objects.filter(nombre__icontains="AYG").first()
        
        if not empresa_cliente:
            print("⚠️  No se encontró empresa cliente, usando Snabbit como cliente también")
            empresa_cliente = empresa_prestadora
    except Empresa.DoesNotExist:
        print("❌ Error: No se encontraron las empresas necesarias")
        return None, None, None, None, None, None
    
    # Buscar usuarios existentes
    try:
        # Usuario técnico
        tecnico_user = User.objects.filter(email__icontains="tecnico").first()
        if tecnico_user:
            tecnico = UsuarioEmpresa.objects.get(usuario=tecnico_user, sucursal__empresa=empresa_prestadora)
        else:
            tecnico = None
        
        # Usuario responsable (puede ser el mismo técnico u otro)
        responsable_user = User.objects.filter(is_staff=True).exclude(id=tecnico_user.id if tecnico_user else None).first()
        if responsable_user:
            responsable = UsuarioEmpresa.objects.filter(usuario=responsable_user, sucursal__empresa=empresa_prestadora).first()
        else:
            responsable = tecnico
        
        # Usuario solicitante (del lado del cliente)
        solicitante_user = User.objects.filter(email__icontains="aguilera").first()
        if solicitante_user:
            solicitante = UsuarioEmpresa.objects.filter(usuario=solicitante_user).first()
        else:
            solicitante = None
        
        # Usuario para seguimientos
        usuario_seguimiento = responsable or tecnico
        
        print(f"✅ Técnico: {tecnico}")
        print(f"✅ Responsable: {responsable}")
        print(f"✅ Solicitante: {solicitante}")
        
        return empresa_prestadora, empresa_cliente, tecnico, responsable, solicitante, usuario_seguimiento
        
    except Exception as e:
        print(f"❌ Error al obtener usuarios: {str(e)}")
        return None, None, None, None, None, None


def obtener_o_crear_categoria_gasto():
    """Obtiene o crea categorías de gasto de rendición"""
    print("\n💰 Verificando categorías de gasto...")
    
    categorias = []
    nombres_categorias = [
        "Transporte",
        "Alimentación",
        "Materiales",
        "Combustible",
        "Hospedaje"
    ]
    
    for nombre in nombres_categorias:
        categoria, created = CategoriaGastoRendicion.objects.get_or_create(
            nombre=nombre,
            defaults={'descripcion': f'Gastos de {nombre.lower()}'}
        )
        categorias.append(categoria)
        status = "creada" if created else "existente"
        print(f"  {'✨' if created else '✅'} Categoría '{nombre}' {status}")
    
    return categorias


@transaction.atomic
def crear_orden_trabajo_completa(
    empresa, cliente, tecnico, responsable, solicitante, 
    usuario_seguimiento, categorias, numero=1
):
    """Crea una orden de trabajo completa con todas sus relaciones"""
    
    print(f"\n{'='*80}")
    print(f"🔨 Creando Orden de Trabajo #{numero}")
    print(f"{'='*80}")
    
    # Fechas
    hoy = date.today()
    fecha_inicio = hoy - timedelta(days=10 * numero)
    fecha_fin = fecha_inicio + timedelta(days=30)
    
    # Crear Orden de Trabajo
    estados = ['pendiente', 'en_proceso', 'completada']
    prioridades = ['1', '2', '3']
    
    orden = OrdenDeTrabajo.objects.create(
        empresa=empresa,
        cliente=cliente,
        fecha_inicio_ot=fecha_inicio,
        fecha_finalizacion_ot=fecha_fin,
        estado=estados[numero % len(estados)],
        descripcion=f"Orden de trabajo de prueba #{numero}\n"
                   f"Incluye mantenimiento preventivo y correctivo de equipos.\n"
                   f"Se requiere revisión completa de sistemas.",
        prioridad=prioridades[numero % len(prioridades)],
        notas_internas=f"Notas internas para OT #{numero}. Cliente requiere atención especial.",
        responsable_empresa=responsable,
        solicitante_empresa=solicitante
    )
    print(f"✅ Orden creada: {orden}")
    
    # Usuarios Asignados
    print("\n👥 Asignando usuarios...")
    if tecnico:
        usuario_asignado = UsuarioAsignadoOT.objects.create(
            orden=orden,
            usuario_empresa=tecnico
        )
        print(f"  ✅ Usuario interno: {tecnico.usuario.get_nombre()}")
    
    # Usuario externo
    usuario_externo = UsuarioAsignadoOT.objects.create(
        orden=orden,
        usuario_externo=f"Contratista Externo #{numero}",
        correo_usuario_externo=f"contratista{numero}@external.com"
    )
    print(f"  ✅ Usuario externo: {usuario_externo.usuario_externo}")
    
    # Detalles de Trabajo
    print("\n🔨 Creando detalles de trabajo...")
    detalles_info = [
        {
            'nombre': f'Mantenimiento Preventivo #{numero}',
            'descripcion': 'Revisión general de equipos y sistemas',
            'estado': 'completado'
        },
        {
            'nombre': f'Reparación de Fallas #{numero}',
            'descripcion': 'Corrección de problemas detectados durante la inspección',
            'estado': 'en_proceso'
        },
        {
            'nombre': f'Actualización de Software #{numero}',
            'descripcion': 'Instalación de últimas versiones y parches de seguridad',
            'estado': 'pendiente'
        }
    ]
    
    detalles = []
    for idx, info in enumerate(detalles_info, 1):
        detalle = DetalleTrabajo.objects.create(
            orden=orden,
            nombre=info['nombre'],
            descripcion=info['descripcion'],
            estado=info['estado'],
            tecnico_asignado=tecnico if tecnico and idx % 2 == 0 else None
        )
        detalles.append(detalle)
        tecnico_info = f" - Técnico: {tecnico.usuario.get_nombre()}" if detalle.tecnico_asignado else ""
        print(f"  ✅ Detalle {idx}: {info['nombre']} ({info['estado']}){tecnico_info}")
        
        # Seguimientos para cada detalle
        seguimientos_info = [
            {
                'tipo': 'comentario',
                'comentario': f'Inicio de trabajo para detalle {idx}'
            },
            {
                'tipo': 'actualizacion',
                'comentario': f'Progreso al 50% en detalle {idx}'
            },
            {
                'tipo': 'incidencia',
                'comentario': f'Se encontró problema menor en detalle {idx}, resuelto'
            }
        ]
        
        for seg_idx, seg_info in enumerate(seguimientos_info[:idx], 1):  # Más seguimientos para detalles más avanzados
            seguimiento = SeguimientoDetalleTrabajo.objects.create(
                detalle_trabajo=detalle,
                tipo=seg_info['tipo'],
                comentario=seg_info['comentario'],
                usuario=usuario_seguimiento if usuario_seguimiento else None
            )
            print(f"    📝 Seguimiento {seg_idx}: {seg_info['tipo']}")
    
    # Historial de Cambios
    print("\n📜 Creando historial de cambios...")
    cambios_info = [
        {
            'estado_anterior': 'N/A',
            'estado_actual': 'pendiente',
            'comentario': 'Orden creada y asignada'
        },
        {
            'estado_anterior': 'pendiente',
            'estado_actual': 'en_proceso',
            'comentario': 'Inicio de trabajos en sitio'
        }
    ]
    
    if orden.estado == 'completada':
        cambios_info.append({
            'estado_anterior': 'en_proceso',
            'estado_actual': 'completada',
            'comentario': 'Trabajos finalizados satisfactoriamente'
        })
    
    for idx, cambio_info in enumerate(cambios_info, 1):
        if usuario_seguimiento:
            cambio = HistorialCambiosOrden.objects.create(
                orden=orden,
                estado_anterior=cambio_info['estado_anterior'],
                estado_actual=cambio_info['estado_actual'],
                comentario=cambio_info['comentario'],
                usuario=usuario_seguimiento
            )
            print(f"  ✅ Cambio {idx}: {cambio_info['estado_anterior']} → {cambio_info['estado_actual']}")
    
    # Adjuntos
    print("\n📎 Creando adjuntos...")
    adjuntos_info = [
        {
            'tipo': 'informe',
            'descripcion': f'Informe técnico de inspección inicial OT-{numero}'
        },
        {
            'tipo': 'imagen',
            'descripcion': f'Fotografías del estado actual de equipos OT-{numero}'
        },
        {
            'tipo': 'contrato',
            'descripcion': f'Contrato de servicio firmado OT-{numero}'
        }
    ]
    
    for idx, adj_info in enumerate(adjuntos_info, 1):
        adjunto = AdjuntoDeOrden.objects.create(
            orden=orden,
            tipo=adj_info['tipo'],
            descripcion=adj_info['descripcion']
            # archivo se deja en blanco por ahora
        )
        print(f"  ✅ Adjunto {idx}: {adj_info['tipo']} - {adj_info['descripcion']}")
    
    # Gastos de Rendición
    print("\n💰 Creando gastos de rendición...")
    gastos_info = [
        {
            'categoria': categorias[0],  # Transporte
            'detalle': f'Viaje a sitio del cliente #{numero}',
            'cantidad': 2,
            'monto_unitario': 15000
        },
        {
            'categoria': categorias[1],  # Alimentación
            'detalle': f'Almuerzos durante trabajo en sitio #{numero}',
            'cantidad': 3,
            'monto_unitario': 8000
        },
        {
            'categoria': categorias[2],  # Materiales
            'detalle': f'Materiales y repuestos utilizados #{numero}',
            'cantidad': 5,
            'monto_unitario': 12000
        },
        {
            'categoria': categorias[3],  # Combustible
            'detalle': f'Combustible para traslados #{numero}',
            'cantidad': 1,
            'monto_unitario': 25000
        }
    ]
    
    total_gastos = 0
    for idx, gasto_info in enumerate(gastos_info, 1):
        fecha_gasto = fecha_inicio + timedelta(days=idx * 2)
        gasto = DetalleGastoRendicionOT.objects.create(
            orden=orden,
            categoria=gasto_info['categoria'],
            detalle=gasto_info['detalle'],
            cantidad=gasto_info['cantidad'],
            monto_unitario=gasto_info['monto_unitario'],
            fecha_gasto=fecha_gasto
        )
        total_gastos += gasto.monto_total
        print(f"  ✅ Gasto {idx}: {gasto_info['categoria'].nombre} - ${gasto.monto_total:,}")
    
    print(f"\n💵 Total gastos OT #{numero}: ${total_gastos:,}")
    
    return orden


def main():
    print("🚀 Iniciando creación de datos de prueba para Orden de Trabajo")
    print("=" * 80)
    
    # Obtener datos necesarios
    empresa, cliente, tecnico, responsable, solicitante, usuario_seguimiento = obtener_o_crear_usuarios()
    
    if not empresa or not cliente:
        print("\n❌ No se pueden crear órdenes sin empresas. Ejecuta primero el script de setup básico.")
        return
    
    if not usuario_seguimiento:
        print("\n⚠️  Advertencia: No se encontraron usuarios, algunos datos no se crearán completamente")
    
    # Obtener categorías de gasto
    categorias = obtener_o_crear_categoria_gasto()
    
    # Crear órdenes de trabajo
    print("\n" + "=" * 80)
    print("🏗️  CREANDO ÓRDENES DE TRABAJO")
    print("=" * 80)
    
    ordenes_creadas = []
    cantidad_ordenes = 3  # Crear 3 órdenes de prueba
    
    for i in range(1, cantidad_ordenes + 1):
        try:
            orden = crear_orden_trabajo_completa(
                empresa, cliente, tecnico, responsable, solicitante,
                usuario_seguimiento, categorias, numero=i
            )
            ordenes_creadas.append(orden)
        except Exception as e:
            print(f"\n❌ Error al crear orden #{i}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Resumen final
    print("\n" + "=" * 80)
    print("📊 RESUMEN DE CREACIÓN")
    print("=" * 80)
    print(f"✅ Órdenes de trabajo creadas: {len(ordenes_creadas)}")
    
    for orden in ordenes_creadas:
        usuarios_asignados = orden.usuarioasignadoot_set.count()
        detalles = orden.detalletrabajo_set.count()
        seguimientos = sum(d.seguimientodetalletrabajo_set.count() for d in orden.detalletrabajo_set.all())
        historial = orden.historial.count()
        adjuntos = orden.adjuntodeorden_set.count()
        gastos = orden.detallegastorendicionot_set.count()
        total_gastos = sum(g.monto_total for g in orden.detallegastorendicionot_set.all())
        
        print(f"\n📋 Orden #{orden.id} - {orden.estado.upper()}")
        print(f"   • Cliente: {orden.cliente.nombre}")
        print(f"   • Prioridad: {orden.get_prioridad_display()}")
        print(f"   • Usuarios asignados: {usuarios_asignados}")
        print(f"   • Detalles de trabajo: {detalles}")
        print(f"   • Seguimientos: {seguimientos}")
        print(f"   • Cambios en historial: {historial}")
        print(f"   • Adjuntos: {adjuntos}")
        print(f"   • Gastos: {gastos} (Total: ${total_gastos:,})")
    
    print("\n✨ ¡Datos de prueba creados exitosamente!")
    print("\n💡 Puedes usar la función analizar_orden_trabajo(id) en el notebook para ver los detalles")


if __name__ == "__main__":
    main()
