"""
Script de Reorganización Automatizada de Documentación
======================================================

Este script reorganiza la documentación del proyecto según el plan
definido en PLAN_REORGANIZACION.md.

Uso:
    python reorganize_docs.py              # Dry-run (solo muestra cambios)
    python reorganize_docs.py --execute    # Ejecuta reorganización

Autor: Fabian
Fecha: 2025-11-07
"""

import os
import shutil
import sys
from pathlib import Path

# Directorio base (.github/)
BASE_DIR = Path(__file__).parent

# Mapeo completo: origen → destino
MOVES = {
    # Arquitectura
    "ARQUITECTURA_SISTEMA.md": "arquitectura/sistema.md",
    "ARQUITECTURA_FRONTEND.md": "arquitectura/frontend.md",
    "MODELO_DATOS_SISTEMA.md": "arquitectura/base-de-datos.md",
    "MODELO_NEGOCIO.md": "arquitectura/modelo-negocio.md",
    # Exploraciones
    "EXPLORACION_EMPRESAS.md": "exploracion/empresas.md",
    "EXPLORACION_CONTRATOS.md": "exploracion/contratos.md",
    # Guías
    "INICIALIZACION.md": "guias/inicializacion.md",
    "CONFIGURACION_DESARROLLO.md": "guias/desarrollo.md",
    "GUIA_EXPLORACION_SISTEMA.md": "guias/exploracion-sistema.md",
    "SCRIPTS_UTILIDADES.md": "guias/scripts.md",
    "COPILOT_SETUP.md": "guias/copilot-setup.md",
    # Tracking
    "ESTADO_DOCUMENTACION.md": "tracking/estado-documentacion.md",
    # Otros a raíz (renombrar)
    "INDICE_DOCUMENTACION.md": "INDICE_MAESTRO.md",
    # Instrucciones Backend
    "instructions/backend-instructions.md": "instrucciones/backend/general.md",
    # Instrucciones Frontend
    "instructions/frontend-instructions.md": "instrucciones/frontend/general.md",
    "instructions/redux-thunks.md": "instrucciones/frontend/redux-thunks.md",
    "instructions/store-structure.md": "instrucciones/frontend/store-structure.md",
    # Instrucciones Procesos
    "instructions/standards.md": "instrucciones/procesos/standards.md",
    "instructions/security.md": "instrucciones/procesos/security.md",
    "instructions/pr-flow.md": "instrucciones/procesos/pr-flow.md",
    "instructions/ci-cd.md": "instrucciones/procesos/ci-cd.md",
    "instructions/testing.md": "instrucciones/procesos/testing.md",
    "instructions/performance.md": "instrucciones/procesos/performance.md",
    "instructions/observability.md": "instrucciones/procesos/observability.md",
    # Instrucciones Soporte
    "instructions/playbooks.md": "instrucciones/soporte/playbooks.md",
    "instructions/glossary.md": "instrucciones/soporte/glossary.md",
    "instructions/tasks.instructions.md": "instrucciones/soporte/tasks.md",
    # Permisos (nueva subcarpeta en instrucciones)
    "instructions/permisos-guardian.md": "instrucciones/backend/permisos-guardian.md",
    "instructions/permisos-sistema.md": "instrucciones/backend/permisos-sistema.md",
    # Referencia rápida
    "REFERENCIA_RAPIDA_ENDPOINTS.md": "instrucciones/backend/referencia-endpoints.md",
    # Módulos específicos (evaluar si van a exploracion o arquitectura)
    "MODULO_AUTENTICACION_Y_CONTRATOS.md": "exploracion/autenticacion-contratos.md",
    "MODULO_CONFIDENCIALIDAD.md": "exploracion/confidencialidad.md",
    "MODULO_CONTRATOS_FLUJO_COMPLETO.md": "exploracion/contratos-flujo-completo.md",
    "MODULO_ORDEN_TRABAJO.md": "exploracion/orden-trabajo.md",
    "FLUJO_FACTURACION_CONTRATOS_OT.md": "arquitectura/flujos/facturacion-contratos-ot.md",
}

# Copiar archivos backend/*.md (mantener en misma ubicación relativa)
BACKEND_COPIES = [
    "instructions/backend/core-cuentas.md",
    "instructions/backend/empresas-cotizaciones.md",
    "instructions/backend/contratos-bodegas-items.md",
    "instructions/backend/ordentrabajo-recursos-rendiciones-visitas.md",
    "instructions/backend/vacaciones-calendario-activos-retroalimentacion.md",
]


def ensure_dir(path: Path):
    """Crear directorio si no existe."""
    path.parent.mkdir(parents=True, exist_ok=True)


def move_file(src: Path, dst: Path, dry_run: bool = True):
    """
    Mover archivo de src a dst.

    Args:
        src: Ruta origen
        dst: Ruta destino
        dry_run: Si True, solo muestra qué haría sin ejecutar
    """
    if not src.exists():
        print(f"⚠️  SKIP: {src.relative_to(BASE_DIR)} no existe")
        return False

    if dst.exists():
        print(f"⚠️  SKIP: {dst.relative_to(BASE_DIR)} ya existe")
        return False

    # Crear directorio de destino
    ensure_dir(dst)

    if dry_run:
        print(f"🔍 DRY-RUN: {src.relative_to(BASE_DIR)} → {dst.relative_to(BASE_DIR)}")
        return True
    else:
        shutil.move(str(src), str(dst))
        print(f"✅ MOVED: {src.relative_to(BASE_DIR)} → {dst.relative_to(BASE_DIR)}")
        return True


def copy_file(src: Path, dst: Path, dry_run: bool = True):
    """
    Copiar archivo de src a dst (para archivos backend que se mantienen).

    Args:
        src: Ruta origen
        dst: Ruta destino
        dry_run: Si True, solo muestra qué haría sin ejecutar
    """
    if not src.exists():
        print(f"⚠️  SKIP: {src.relative_to(BASE_DIR)} no existe")
        return False

    if dst.exists():
        print(f"⚠️  SKIP: {dst.relative_to(BASE_DIR)} ya existe")
        return False

    # Crear directorio de destino
    ensure_dir(dst)

    if dry_run:
        print(
            f"🔍 DRY-RUN COPY: {src.relative_to(BASE_DIR)} → {dst.relative_to(BASE_DIR)}"
        )
        return True
    else:
        shutil.copy2(str(src), str(dst))
        print(f"✅ COPIED: {src.relative_to(BASE_DIR)} → {dst.relative_to(BASE_DIR)}")
        return True


def reorganize(dry_run: bool = True):
    """
    Ejecutar reorganización completa.

    Args:
        dry_run: Si True, solo muestra cambios sin ejecutar
    """
    print("=" * 70)
    if dry_run:
        print("🔍 MODO DRY-RUN (no se harán cambios reales)")
        print("   Ejecuta con --execute para aplicar cambios")
    else:
        print("⚠️  EJECUTANDO REORGANIZACIÓN")
        print("   Los archivos serán movidos")
    print("=" * 70)
    print()

    moved_count = 0
    skipped_count = 0

    # Procesar movimientos
    print("📦 Moviendo archivos...")
    print("-" * 70)

    for src_rel, dst_rel in MOVES.items():
        src = BASE_DIR / src_rel
        dst = BASE_DIR / dst_rel

        if move_file(src, dst, dry_run):
            moved_count += 1
        else:
            skipped_count += 1

    # Copiar archivos backend (mantener en ubicación)
    print()
    print("📋 Copiando archivos backend a nueva ubicación...")
    print("-" * 70)

    for backend_file in BACKEND_COPIES:
        src = BASE_DIR / backend_file
        # Cambiar instructions/ por instrucciones/
        dst_rel = backend_file.replace("instructions/", "instrucciones/")
        dst = BASE_DIR / dst_rel

        if copy_file(src, dst, dry_run):
            moved_count += 1
        else:
            skipped_count += 1

    # Resumen
    print()
    print("=" * 70)
    print("📊 RESUMEN")
    print("-" * 70)
    print(f"   Archivos procesados: {moved_count}")
    print(f"   Archivos omitidos: {skipped_count}")

    if dry_run:
        print()
        print("ℹ️  Esto fue un DRY-RUN. Para ejecutar reorganización real:")
        print(f"   python {Path(__file__).name} --execute")
    else:
        print()
        print("✅ Reorganización completada!")
        print()
        print("📝 Próximos pasos:")
        print("   1. Actualizar enlaces en archivos movidos")
        print("   2. Eliminar carpeta instructions/ vacía")
        print("   3. Actualizar copilot-instructions.md")
        print("   4. Commitear cambios")

    print("=" * 70)


def main():
    """Punto de entrada del script."""
    dry_run = "--execute" not in sys.argv

    try:
        reorganize(dry_run=dry_run)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
