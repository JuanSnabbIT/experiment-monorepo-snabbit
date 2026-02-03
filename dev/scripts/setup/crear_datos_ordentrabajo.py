#!/usr/bin/env python
r"""
Script para crear datos de prueba completos para OrdenDeTrabajo
Incluye objetos relacionados: Cotización, VisitaSoporte, Compra, GuiaSalida

Prerequisitos:
- seed_base.py ejecutado exitosamente
- Empresas, usuarios, items y bodegas deben existir

Uso:
    cd backend
    ENV\Scripts\python.exe ..\dev\scripts\setup\crear_datos_ordentrabajo.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configuración de Django
proyecto_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
backend_path = os.path.join(proyecto_path, 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from cuentas.models import User
from empresas.models import Empresa, UsuarioEmpresa, SucursalEmpresa
from ordentrabajo.models import (
    OrdenDeTrabajo, DetalleTrabajo, UsuarioAsignadoOT,
    SeguimientoDetalleTrabajo, HistorialCambiosOrden,
    AdjuntoDeOrden, DetalleGastoRendicionOT
)
from cotizaciones.models import Cotizacion
from visitas.models import VisitaSoporte
from bodegas.models import Compra, GuiaSalida, Bodega, StockItemEnBodega
from items.models import ProveedorEmpresa, ItemEmpresa
from rendiciones.models import CategoriaGastoRendicion
from retroalimentacion.models import Retroalimentacion, RetroalimentacionAplicada
from core.models import PreguntaEnRetroalimentacion


def obtener_o_crear_usuarios():
    """Obtiene usuarios existentes de la BD"""
    usuarios = UsuarioEmpresa.objects.filter(
        sucursal__empresa__nombre='Snabbit'
    ).select_related('usuario', 'sucursal__empresa')[:5]
    
    if not usuarios.exists():
        print("❌ No se encontraron usuarios de Snabbit")
        return []
    
    print(f"✅ Encontrados {usuarios.count()} usuarios:")
    for u in usuarios:
        print(f"   • {u.usuario.get_nombre()} ({u.usuario.email})")
    
    return list(usuarios)


def obtener_o_crear_empresas():
    """Obtiene empresas existentes"""
    snabbit = Empresa.objects.filter(nombre='Snabbit').first()
    clientes = Empresa.objects.exclude(nombre='Snabbit')[:3]
    
    if not snabbit:
        print("❌ No se encontró empresa Snabbit")
        return None, []
    
    print(f"✅ Empresa principal: {snabbit.nombre}")
    print(f"✅ Clientes encontrados: {clientes.count()}")
    for c in clientes:
        print(f"   • {c.nombre}")
    
    return snabbit, list(clientes)


def obtener_o_crear_categoria_gasto():
    """Obtiene o crea categorías de gasto"""
    categorias = []
    nombres_categorias = [
        'Transporte', 'Alimentación', 'Materiales',
        'Herramientas', 'Otros Gastos'
    ]
    
    for nombre in nombres_categorias:
        cat, created = CategoriaGastoRendicion.objects.get_or_create(
            nombre=nombre,
            defaults={'descripcion': f'Gastos de {nombre}'}
        )
        categorias.append(cat)
    
    print(f"✅ Categorías de gasto: {len(categorias)}")
    return categorias


def crear_preguntas_retroalimentacion():
    """Crea preguntas de retroalimentación para cada tipo de trabajo"""
    ct_cotizacion = ContentType.objects.get(app_label='cotizaciones', model='cotizacion')
    ct_visita = ContentType.objects.get(app_label='visitas', model='visitasoporte')
    ct_compra = ContentType.objects.get(app_label='bodegas', model='compra')
    
    preguntas_data = [
        # Preguntas para Cotización
        (ct_cotizacion, '¿Qué tan claro fue el detalle de la cotización?'),
        (ct_cotizacion, '¿El precio fue acorde a sus expectativas?'),
        (ct_cotizacion, '¿La respuesta fue oportuna?'),
        
        # Preguntas para Visita Soporte
        (ct_visita, '¿Cómo califica la atención del técnico?'),
        (ct_visita, '¿Se resolvió el problema satisfactoriamente?'),
        (ct_visita, '¿El tiempo de respuesta fue adecuado?'),
        
        # Preguntas para Compra
        (ct_compra, '¿Los materiales llegaron en buen estado?'),
        (ct_compra, '¿La calidad cumplió sus expectativas?'),
    ]
    
    preguntas_creadas = []
    for content_type, texto in preguntas_data:
        pregunta, created = PreguntaEnRetroalimentacion.objects.get_or_create(
            content_type=content_type,
            texto=texto,
            defaults={'activo': True}
        )
        if created:
            preguntas_creadas.append(pregunta)
    
    print(f"✅ Preguntas de retroalimentación: {PreguntaEnRetroalimentacion.objects.filter(activo=True).count()} activas")
    print(f"   • Cotización: {PreguntaEnRetroalimentacion.objects.filter(content_type=ct_cotizacion, activo=True).count()}")
    print(f"   • Visita: {PreguntaEnRetroalimentacion.objects.filter(content_type=ct_visita, activo=True).count()}")
    print(f"   • Compra: {PreguntaEnRetroalimentacion.objects.filter(content_type=ct_compra, activo=True).count()}")
    
    return preguntas_creadas


def crear_cotizacion(empresa, cliente, usuario):
    """Crea una Cotización de prueba"""
    cotizacion = Cotizacion.objects.create(
        nombre=f"Cotización Servicios {cliente.nombre}",
        empresa=empresa,
        cliente=cliente,
        numero_cotizacion=100 + Cotizacion.objects.count(),
        fecha_vencimiento=datetime.now().date() + timedelta(days=30),
        estado='aprobada',
        descripcion='Cotización para servicios de soporte técnico',
        total_estimado=Decimal('500000.00'),
        tipo_moneda='1'  # Pesos chilenos
    )
    print(f"✅ Cotización creada: #{cotizacion.numero_cotizacion}")
    return cotizacion


def crear_visita_soporte(empresa, cliente):
    """Crea una VisitaSoporte de prueba"""
    visita = VisitaSoporte.objects.create(
        empresa=empresa,
        cliente=cliente,
        descripcion_servicio='Visita de soporte técnico programada',
        estado='completada'
    )
    print(f"✅ VisitaSoporte creada: #{visita.id}")
    return visita


def crear_compra(sucursal, usuario):
    """Crea una Compra de prueba"""
    import random
    # Obtener o crear proveedor
    proveedor = ProveedorEmpresa.objects.first()
    if not proveedor:
        print("⚠️  No hay proveedores, creando compra sin proveedor")
    
    compra = Compra.objects.create(
        codigo=f"COMP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(100,999)}",
        tipo='nacional',
        sucursal=sucursal,
        proveedor=proveedor,
        creado_por=usuario,
        observaciones='Compra de materiales para OT',
        estado='A'  # Aprobada
    )
    print(f"✅ Compra creada: {compra.codigo}")
    return compra


def crear_guia_salida(bodega, usuario):
    """Crea una GuiaSalida de prueba"""
    guia = GuiaSalida.objects.create(
        bodega=bodega,
        creado_por=usuario,
        recibido_por=usuario,
        motivo='Salida de materiales para orden de trabajo',
        estado='A'  # Aprobada
    )
    print(f"✅ GuiaSalida creada: #{guia.id}")
    return guia


def crear_orden_trabajo_completa(
    empresa, cliente, usuarios, categorias,
    cotizacion=None, visita=None, compra=None, guia_salida=None
):
    """Crea una OT completa con todos los detalles y objetos relacionados"""
    
    # Seleccionar usuarios para responsable y solicitante
    responsable = usuarios[0] if usuarios else None
    solicitante = usuarios[1] if len(usuarios) > 1 else responsable
    
    # Crear Orden de Trabajo
    orden = OrdenDeTrabajo.objects.create(
        empresa=empresa,
        cliente=cliente,
        responsable_empresa=responsable,
        solicitante_empresa=solicitante,
        descripcion=f"OT con objetos relacionados - {datetime.now().strftime('%Y-%m-%d')}",
        estado='en_proceso',
        prioridad='media',
        fecha_inicio_ot=datetime.now(),
        notas_internas='Orden con todos los objetos relacionados creados'
    )
    
    print(f"\n{'='*60}")
    print(f"📋 ORDEN DE TRABAJO #{orden.id} CREADA")
    print(f"{'='*60}")
    print(f"Empresa: {empresa.nombre}")
    print(f"Cliente: {cliente.nombre}")
    
    # Usuarios asignados (2 internos + 1 externo)
    usuarios_internos = usuarios[:2] if len(usuarios) >= 2 else usuarios
    for i, usuario in enumerate(usuarios_internos):
        UsuarioAsignadoOT.objects.create(
            orden=orden,
            usuario_empresa=usuario
        )
        print(f"✅ Usuario asignado: {usuario.usuario.get_nombre()}")
    
    # Usuario externo
    UsuarioAsignadoOT.objects.create(
        orden=orden,
        usuario_externo='Técnico Externo Contratista',
        correo_usuario_externo='externo@ejemplo.com'
    )
    print(f"✅ Usuario externo asignado")
    
    # Obtener ContentTypes
    ct_cotizacion = ContentType.objects.get_for_model(Cotizacion)
    ct_visita = ContentType.objects.get_for_model(VisitaSoporte)
    ct_compra = ContentType.objects.get_for_model(Compra)
    
    # Detalle 1: Con Cotización
    detalle1 = DetalleTrabajo.objects.create(
        orden=orden,
        nombre='Instalación según Cotización',
        descripcion='Trabajo basado en cotización aprobada',
        estado='en_proceso',
        content_type=ct_cotizacion if cotizacion else None,
        trabajo_id=cotizacion.id if cotizacion else None,
        tecnico_asignado=usuarios[2] if len(usuarios) > 2 else None
    )
    print(f"✅ Detalle 1: Con Cotización #{cotizacion.numero_cotizacion if cotizacion else 'N/A'}")
    
    # Detalle 2: Con VisitaSoporte y GuiaSalida
    detalle2 = DetalleTrabajo.objects.create(
        orden=orden,
        nombre='Seguimiento Visita Soporte',
        descripcion='Trabajo derivado de visita previa',
        estado='pendiente',
        content_type=ct_visita if visita else None,
        trabajo_id=visita.id if visita else None,
        insumo=guia_salida
    )
    print(f"✅ Detalle 2: Con VisitaSoporte #{visita.id if visita else 'N/A'} e Insumo #{guia_salida.id if guia_salida else 'N/A'}")
    
    # Detalle 3: Con Compra
    detalle3 = DetalleTrabajo.objects.create(
        orden=orden,
        nombre='Instalación de Compra',
        descripcion='Instalación de materiales comprados',
        estado='completado',
        content_type=ct_compra if compra else None,
        trabajo_id=compra.id if compra else None,
        tecnico_asignado=usuarios[0] if usuarios else None
    )
    print(f"✅ Detalle 3: Con Compra {compra.codigo if compra else 'N/A'}")
    
    # Seguimientos para cada detalle (2 por detalle)
    detalles = [detalle1, detalle2, detalle3]
    for idx, detalle in enumerate(detalles, 1):
        for seg_num in range(1, 3):
            SeguimientoDetalleTrabajo.objects.create(
                detalle_trabajo=detalle,
                tipo='inicio' if seg_num == 1 else 'comentario',
                comentario=f'Seguimiento #{seg_num} para detalle {idx}',
                usuario=usuarios[0] if usuarios else None
            )
    print(f"✅ Seguimientos creados: 6 total (2 por detalle)")
    
    # Historial de cambios
    for i in range(2):
        HistorialCambiosOrden.objects.create(
            orden=orden,
            estado_anterior='pendiente' if i == 0 else 'en_proceso',
            estado_actual='en_proceso' if i == 0 else 'en_proceso',
            comentario=f'Cambio de estado #{i+1}',
            usuario=usuarios[0] if usuarios else None
        )
    print(f"✅ Historial de cambios: 2 registros")
    
    # Adjuntos
    for i in range(3):
        AdjuntoDeOrden.objects.create(
            orden=orden,
            tipo='documento' if i < 2 else 'imagen',
            descripcion=f'Adjunto de prueba #{i+1}'
        )
    print(f"✅ Adjuntos: 3 documentos")
    
    # Gastos de rendición
    montos = [15000, 25000, 8000, 12000]
    for i, (cat, monto) in enumerate(zip(categorias[:4], montos)):
        DetalleGastoRendicionOT.objects.create(
            orden=orden,
            categoria=cat,
            detalle=f'Gasto en {cat.nombre}',
            cantidad=1,
            monto_unitario=monto,
            monto_total=monto,
            fecha_gasto=datetime.now().date()
        )
    print(f"✅ Gastos de rendición: ${sum(montos):,}")
    
    # Crear Retroalimentación para la OT
    retroalimentacion = Retroalimentacion.objects.create(
        orden_trabajo=orden,
        usuario_empresa=usuarios[0] if usuarios else None,
        observacion_retroalimentacion='Excelente servicio, todo según lo esperado',
        fecha_retroalimentacion=datetime.now()
    )
    
    # Generar preguntas aplicables basadas en los trabajos relacionados
    retroalimentacion.generar_preguntas_aplicables()
    
    # Responder las preguntas con calificaciones aleatorias
    import random
    preguntas_aplicadas = retroalimentacion.retroalimentacion_aplicada.all()
    for pregunta_aplicada in preguntas_aplicadas:
        pregunta_aplicada.cantidad_estrellas = Decimal(str(random.uniform(4.0, 5.0)))
        pregunta_aplicada.observaciones = f'Respuesta a: {pregunta_aplicada.pregunta.texto[:30]}...'
        pregunta_aplicada.save()
    
    print(f"✅ Retroalimentación: {preguntas_aplicadas.count()} preguntas respondidas")
    
    print(f"{'='*60}\n")
    return orden


@transaction.atomic
def main():
    print("\n" + "="*80)
    print("🚀 CREACIÓN DE DATOS COMPLETOS PARA ORDENES DE TRABAJO")
    print("="*80 + "\n")
    
    # Obtener datos base
    usuarios = obtener_o_crear_usuarios()
    if not usuarios:
        print("❌ No se pueden crear OTs sin usuarios")
        return
    
    empresa, clientes = obtener_o_crear_empresas()
    if not empresa or not clientes:
        print("❌ No se pueden crear OTs sin empresas")
        return
    
    categorias = obtener_o_crear_categoria_gasto()
    
    # Crear preguntas de retroalimentación
    crear_preguntas_retroalimentacion()
    
    # Obtener sucursal y bodega para objetos relacionados
    sucursal = SucursalEmpresa.objects.filter(empresa=empresa).first()
    bodega = Bodega.objects.filter(sucursal__empresa=empresa).first()
    
    if not bodega:
        print("⚠️  No hay bodegas disponibles, GuiaSalida no se creará")
    
    # Crear 2 OTs completas
    for i, cliente in enumerate(clientes[:2], 1):
        print(f"\n🔨 Creando OT #{i} para cliente {cliente.nombre}...")
        
        # Crear objetos relacionados
        cotizacion = crear_cotizacion(empresa, cliente, usuarios[0])
        visita = crear_visita_soporte(empresa, cliente)
        compra = crear_compra(sucursal, usuarios[0]) if sucursal else None
        guia_salida = crear_guia_salida(bodega, usuarios[0]) if bodega else None
        
        # Crear OT con todos los objetos
        orden = crear_orden_trabajo_completa(
            empresa=empresa,
            cliente=cliente,
            usuarios=usuarios,
            categorias=categorias,
            cotizacion=cotizacion,
            visita=visita,
            compra=compra,
            guia_salida=guia_salida
        )
    
    print("\n" + "="*80)
    print("✅ PROCESO COMPLETADO")
    print("="*80)
    print("📊 Resumen:")
    print(f"   • Órdenes de Trabajo creadas: 2")
    print(f"   • Cotizaciones: 2")
    print(f"   • Visitas de Soporte: 2")
    print(f"   • Compras: 2")
    print(f"   • Guías de Salida: {2 if bodega else 0}")
    print(f"   • Detalles de Trabajo: 6 (3 por OT)")
    print(f"   • Seguimientos: 12 total")
    print(f"   • Retroalimentaciones: 2 (con preguntas respondidas)")
    total_preguntas = PreguntaEnRetroalimentacion.objects.filter(activo=True).count()
    print(f"   • Preguntas Configuradas: {total_preguntas}")
    print("="*80 + "\n")


if __name__ == '__main__':
    main()
