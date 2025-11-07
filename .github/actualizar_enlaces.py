#!/usr/bin/env python3
"""
Script para actualizar automáticamente enlaces internos tras reorganización.

Autor: GitHub Copilot
Fecha: 2025-11-07
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Directorio raíz
WORKSPACE_ROOT = Path(__file__).parent.parent
GITHUB_DIR = WORKSPACE_ROOT / ".github"

# Mapeo de rutas antiguas a nuevas (patrones más comunes)
LINK_REPLACEMENTS = {
    # Archivos raíz movidos a carpetas
    r"\.\/ARQUITECTURA_SISTEMA\.md": "./arquitectura/sistema.md",
    r"\.\.\/ARQUITECTURA_SISTEMA\.md": "../arquitectura/sistema.md",
    r"\.\/ARQUITECTURA_FRONTEND\.md": "./arquitectura/frontend.md",
    r"\.\.\/ARQUITECTURA_FRONTEND\.md": "../arquitectura/frontend.md",
    r"\.\/CONFIGURACION_DESARROLLO\.md": "./guias/desarrollo.md",
    r"\.\.\/CONFIGURACION_DESARROLLO\.md": "../guias/desarrollo.md",
    r"\.\/SCRIPTS_UTILIDADES\.md": "./guias/scripts.md",
    r"\.\.\/SCRIPTS_UTILIDADES\.md": "../guias/scripts.md",
    r"\.\/INICIALIZACION\.md": "./guias/inicializacion.md",
    r"\.\.\/INICIALIZACION\.md": "../guias/inicializacion.md",
    r"\.\/EXPLORACION_EMPRESAS\.md": "./exploracion/empresas.md",
    r"\.\.\/EXPLORACION_EMPRESAS\.md": "../exploracion/empresas.md",
    r"\.\/INDICE_DOCUMENTACION\.md": "./INDICE_MAESTRO.md",
    r"\.\.\/INDICE_DOCUMENTACION\.md": "../INDICE_MAESTRO.md",
    # Carpeta instructions → instrucciones
    r"\.\/instructions\/": "./instrucciones/",
    r"\.\.\/instructions\/": "../instrucciones/",
    r"`\.github/instructions/`": "`.github/instrucciones/`",
    r"`.github\/instructions\/": "`.github/instrucciones/",
    # Archivos específicos renombrados
    r"\.\/instructions\/backend-instructions\.md": "./instrucciones/backend/general.md",
    r"\.\.\/instructions\/backend-instructions\.md": "../instrucciones/backend/general.md",
    r"\.\/backend-instructions\.md": "./backend/general.md",
    r"\.\.\/backend-instructions\.md": "../backend/general.md",
    r"\.\/instructions\/frontend-instructions\.md": "./instrucciones/frontend/general.md",
    r"\.\.\/instructions\/frontend-instructions\.md": "../instrucciones/frontend/general.md",
    r"\.\/frontend-instructions\.md": "./frontend/general.md",
    r"\.\.\/frontend-instructions\.md": "../frontend/general.md",
    r"\.\/instructions\/redux-thunks\.md": "./instrucciones/frontend/redux-thunks.md",
    r"\.\.\/instructions\/redux-thunks\.md": "../instrucciones/frontend/redux-thunks.md",
    r"\.\/instructions\/store-structure\.md": "./instrucciones/frontend/store-structure.md",
    r"\.\.\/instructions\/store-structure\.md": "../instrucciones/frontend/store-structure.md",
    # Archivos de procesos
    r"\.\/instructions\/standards\.md": "./instrucciones/procesos/standards.md",
    r"\.\.\/instructions\/standards\.md": "../instrucciones/procesos/standards.md",
    r"\.\/standards\.md": "./procesos/standards.md",
    r"\.\/instructions\/security\.md": "./instrucciones/procesos/security.md",
    r"\.\.\/instructions\/security\.md": "../instrucciones/procesos/security.md",
    r"\.\/security\.md": "./procesos/security.md",
    r"\.\.\/security\.md": "../procesos/security.md",
    r"\.\/instructions\/pr-flow\.md": "./instrucciones/procesos/pr-flow.md",
    r"\.\.\/instructions\/pr-flow\.md": "../instrucciones/procesos/pr-flow.md",
    r"\.\/pr-flow\.md": "./procesos/pr-flow.md",
    r"\.\/instructions\/ci-cd\.md": "./instrucciones/procesos/ci-cd.md",
    r"\.\.\/instructions\/ci-cd\.md": "../instrucciones/procesos/ci-cd.md",
    r"\.\/ci-cd\.md": "./procesos/ci-cd.md",
    r"\.\/instructions\/testing\.md": "./instrucciones/procesos/testing.md",
    r"\.\.\/instructions\/testing\.md": "../instrucciones/procesos/testing.md",
    r"\.\/instructions\/performance\.md": "./instrucciones/procesos/performance.md",
    r"\.\.\/instructions\/performance\.md": "../instrucciones/procesos/performance.md",
    r"\.\/instructions\/observability\.md": "./instrucciones/procesos/observability.md",
    r"\.\.\/instructions\/observability\.md": "../instrucciones/procesos/observability.md",
    r"\.\/observability\.md": "./procesos/observability.md",
    # Archivos de soporte
    r"\.\/instructions\/playbooks\.md": "./instrucciones/soporte/playbooks.md",
    r"\.\.\/instructions\/playbooks\.md": "../instrucciones/soporte/playbooks.md",
    r"\.\/playbooks\.md": "./soporte/playbooks.md",
    r"\.\/instructions\/glossary\.md": "./instrucciones/soporte/glossary.md",
    r"\.\.\/instructions\/glossary\.md": "../instrucciones/soporte/glossary.md",
    r"\.\/glossary\.md": "./soporte/glossary.md",
    r"\.\/instructions\/tasks\.instructions\.md": "./instrucciones/soporte/tasks.md",
    r"\.\.\/instructions\/tasks\.instructions\.md": "../instrucciones/soporte/tasks.md",
    # Referencias sin enlace markdown
    r"INDICE_DOCUMENTACION\.md": "INDICE_MAESTRO.md",
    r"`ARQUITECTURA_SISTEMA\.md`": "`arquitectura/sistema.md`",
    r"`ARQUITECTURA_FRONTEND\.md`": "`arquitectura/frontend.md`",
    r"`CONFIGURACION_DESARROLLO\.md`": "`guias/desarrollo.md`",
    r"`SCRIPTS_UTILIDADES\.md`": "`guias/scripts.md`",
    r"`INICIALIZACION\.md`": "`guias/inicializacion.md`",
    r"`EXPLORACION_EMPRESAS\.md`": "`exploracion/empresas.md`",
}


def find_markdown_files(root: Path) -> List[Path]:
    """Encuentra todos los archivos .md en .github"""
    md_files = []
    for path in root.rglob("*.md"):
        exclude_parts = [
            "node_modules",
            "ENV",
            "bkp",
            "dist",
            "build",
            "__pycache__",
            ".git",
        ]
        if any(part in exclude_parts for part in path.parts):
            continue
        if ".github" not in path.parts:
            continue
        md_files.append(path)
    return sorted(md_files)


def update_file_links(file_path: Path, dry_run: bool = True) -> Tuple[int, List[str]]:
    """
    Actualiza enlaces en un archivo.

    Returns:
        Tupla de (num_cambios, lista_de_cambios_descripcion)
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        changes = []

        # Aplicar cada reemplazo
        for old_pattern, new_pattern in LINK_REPLACEMENTS.items():
            matches = list(re.finditer(old_pattern, content))
            if matches:
                content = re.sub(old_pattern, new_pattern, content)
                changes.append(f"{old_pattern} → {new_pattern} ({len(matches)} veces)")

        # Si hubo cambios y no es dry-run, guardar
        if content != original_content:
            if not dry_run:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
            return (len(changes), changes)

        return (0, [])

    except Exception as e:
        print(f"⚠️  Error procesando {file_path}: {e}")
        return (0, [])


def main():
    """Función principal."""
    import sys

    dry_run = "--execute" not in sys.argv

    print("=" * 80)
    print("🔧 ACTUALIZADOR DE ENLACES - Reorganización de Documentación")
    print("=" * 80)
    print()

    if dry_run:
        print("🔍 MODO DRY-RUN (simulación)")
        print(
            "   Para aplicar cambios, ejecuta: python actualizar_enlaces.py --execute"
        )
    else:
        print("✏️  MODO EJECUCIÓN (aplicando cambios)")
    print()

    # Encontrar archivos
    print(f"📁 Buscando archivos Markdown en {GITHUB_DIR}...")
    md_files = find_markdown_files(GITHUB_DIR)
    print(f"   Encontrados: {len(md_files)} archivos\n")

    # Estadísticas
    total_files_changed = 0
    total_replacements = 0
    files_with_changes = []

    # Procesar cada archivo
    print("🔗 Actualizando enlaces...")
    print("-" * 80)

    for md_file in md_files:
        rel_path = md_file.relative_to(WORKSPACE_ROOT)
        num_changes, changes = update_file_links(md_file, dry_run=dry_run)

        if num_changes > 0:
            total_files_changed += 1
            total_replacements += num_changes
            files_with_changes.append((rel_path, changes))
            print(f"✏️  {rel_path} ({num_changes} patrones actualizados)")
        else:
            print(f"✅ {rel_path} (sin cambios)")

    print("-" * 80)
    print()

    # Detalles de cambios
    if files_with_changes:
        print("📝 DETALLE DE CAMBIOS:")
        print("=" * 80)
        for file_path, changes in files_with_changes:
            print(f"\n📄 {file_path}")
            for change in changes:
                print(f"   • {change}")
        print()

    # Resumen
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"Archivos procesados:     {len(md_files)}")
    print(f"Archivos modificados:    {total_files_changed}")
    print(f"Patrones actualizados:   {total_replacements}")
    print()

    if dry_run:
        print("ℹ️  Esta fue una simulación. Los archivos NO fueron modificados.")
        print("   Para aplicar los cambios, ejecuta:")
        print("   python actualizar_enlaces.py --execute")
    else:
        print("✅ Cambios aplicados exitosamente")
        print("   Recomendación: Ejecuta validar_enlaces.py para verificar")

    return 0


if __name__ == "__main__":
    exit(main())
