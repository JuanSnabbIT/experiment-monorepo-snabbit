#!/usr/bin/env python3
"""
Script para validar enlaces internos en archivos Markdown después de reorganización.

Autor: GitHub Copilot
Fecha: 2025-11-07
"""

import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

# Directorio raíz de documentación
DOCS_ROOT = Path(__file__).parent
WORKSPACE_ROOT = DOCS_ROOT.parent

# Patrones de enlaces a validar
LINK_PATTERNS = [
    r"\[([^\]]+)\]\((\./[^\)]+)\)",  # Enlaces relativos ./path
    r"\[([^\]]+)\]\(([^\)]+\.md)\)",  # Enlaces a archivos .md
]

# Rutas antiguas que no deberían existir
DEPRECATED_PATHS = [
    "instructions/",
    "INDICE_DOCUMENTACION.md",
    "ARQUITECTURA_SISTEMA.md",
    "ARQUITECTURA_FRONTEND.md",
    "CONFIGURACION_DESARROLLO.md",
    "SCRIPTS_UTILIDADES.md",
    "EXPLORACION_EMPRESAS.md",
    "INICIALIZACION.md",
]


def find_markdown_files(root: Path) -> List[Path]:
    """Encuentra todos los archivos .md en el directorio raíz."""
    md_files = []
    for path in root.rglob("*.md"):
        # Excluir node_modules, ENV, etc., pero permitir .github
        exclude_parts = [
            "node_modules",
            "ENV",
            "bkp",
            "dist",
            "build",
            "__pycache__",
            ".git",
        ]
        path_str = str(path)
        # Excluir si tiene partes prohibidas (excepto .github)
        if any(part in exclude_parts for part in path.parts):
            continue
        # Incluir solo si está en .github o es documentación relevante
        if ".github" not in path.parts and "README.md" not in path.name:
            continue
        md_files.append(path)
    return sorted(md_files)


def extract_links(file_path: Path) -> List[Tuple[int, str, str]]:
    """
    Extrae enlaces de un archivo Markdown.

    Returns:
        Lista de tuplas (línea, texto_enlace, ruta)
    """
    links = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                for pattern in LINK_PATTERNS:
                    matches = re.finditer(pattern, line)
                    for match in matches:
                        text = match.group(1)
                        path = match.group(2)
                        # Ignorar enlaces externos y anclas
                        if not path.startswith("http") and not path.startswith("#"):
                            links.append((line_num, text, path))
    except Exception as e:
        print(f"⚠️  Error leyendo {file_path}: {e}")
    return links


def resolve_link_path(source_file: Path, link_path: str) -> Path:
    """
    Resuelve la ruta absoluta de un enlace relativo.

    Args:
        source_file: Archivo que contiene el enlace
        link_path: Ruta del enlace (ej: ./otro-archivo.md)

    Returns:
        Ruta absoluta al archivo enlazado
    """
    # Remover anclas (#section)
    link_path = link_path.split("#")[0]

    # Si es relativo a .github
    if link_path.startswith("./"):
        base_dir = source_file.parent
        return (base_dir / link_path[2:]).resolve()

    # Si es relativo sin ./
    return (source_file.parent / link_path).resolve()


def validate_links(file_path: Path, links: List[Tuple[int, str, str]]) -> List[Dict]:
    """
    Valida que los enlaces apunten a archivos existentes.

    Returns:
        Lista de diccionarios con enlaces rotos
    """
    broken_links = []
    for line_num, text, link_path in links:
        resolved_path = resolve_link_path(file_path, link_path)

        if not resolved_path.exists():
            broken_links.append(
                {
                    "file": file_path,
                    "line": line_num,
                    "text": text,
                    "link": link_path,
                    "resolved": resolved_path,
                }
            )

    return broken_links


def find_deprecated_references(file_path: Path) -> List[Tuple[int, str]]:
    """
    Encuentra referencias a rutas antiguas que ya no deberían existir.

    Returns:
        Lista de tuplas (línea, contenido)
    """
    deprecated_refs = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                for deprecated in DEPRECATED_PATHS:
                    if deprecated in line and not line.strip().startswith("#"):
                        deprecated_refs.append((line_num, line.strip()))
                        break
    except Exception as e:
        print(f"⚠️  Error leyendo {file_path}: {e}")

    return deprecated_refs


def main():
    """Función principal del script."""
    import io
    import sys

    # Configurar salida UTF-8 para Windows
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

    print("=" * 80)
    print("🔍 VALIDADOR DE ENLACES - Reorganización de Documentación")
    print("=" * 80)
    print()

    # Encontrar todos los archivos Markdown
    print(f"📁 Buscando archivos Markdown en {WORKSPACE_ROOT}...")
    md_files = find_markdown_files(WORKSPACE_ROOT)
    # Filtrar solo archivos de .github
    md_files = [f for f in md_files if ".github" in f.parts]
    print(f"   Encontrados: {len(md_files)} archivos en .github/\n")

    # Estadísticas
    total_links = 0
    broken_links_by_file = defaultdict(list)
    deprecated_refs_by_file = defaultdict(list)

    # Validar cada archivo
    print("🔗 Validando enlaces...")
    print("-" * 80)

    for md_file in md_files:
        rel_path = md_file.relative_to(WORKSPACE_ROOT)

        # Extraer y validar enlaces
        links = extract_links(md_file)
        total_links += len(links)

        broken = validate_links(md_file, links)
        if broken:
            broken_links_by_file[rel_path] = broken

        # Buscar referencias a rutas antiguas
        deprecated = find_deprecated_references(md_file)
        if deprecated:
            deprecated_refs_by_file[rel_path] = deprecated

        # Mostrar progreso
        status = "✅" if not broken and not deprecated else "⚠️ "
        print(f"{status} {rel_path} ({len(links)} enlaces)")

    print("-" * 80)
    print()

    # Reporte de enlaces rotos
    if broken_links_by_file:
        print("❌ ENLACES ROTOS ENCONTRADOS:")
        print("=" * 80)
        for file_path, broken in broken_links_by_file.items():
            print(f"\n📄 {file_path}")
            for link in broken:
                print(f"   Línea {link['line']}: [{link['text']}]({link['link']})")
                print(f"      Esperado: {link['resolved']}")
        print()
    else:
        print("✅ No se encontraron enlaces rotos\n")

    # Reporte de referencias a rutas antiguas
    if deprecated_refs_by_file:
        print("⚠️  REFERENCIAS A RUTAS ANTIGUAS:")
        print("=" * 80)
        for file_path, refs in deprecated_refs_by_file.items():
            print(f"\n📄 {file_path}")
            for line_num, content in refs:
                print(f"   Línea {line_num}: {content[:80]}...")
        print()
    else:
        print("✅ No se encontraron referencias a rutas antiguas\n")

    # Resumen final
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"Archivos analizados:        {len(md_files)}")
    print(f"Total de enlaces validados: {total_links}")
    print(
        f"Enlaces rotos:              {sum(len(b) for b in broken_links_by_file.values())}"
    )
    print(
        f"Referencias antiguas:       {sum(len(r) for r in deprecated_refs_by_file.values())}"
    )
    print()

    # Código de salida
    if broken_links_by_file or deprecated_refs_by_file:
        print("⚠️  Validación completada CON WARNINGS")
        print("   Acción requerida: Revisar y corregir enlaces reportados")
        return 1
    else:
        print("✅ Validación completada SIN ERRORES")
        print("   Todos los enlaces están correctos")
        return 0


if __name__ == "__main__":
    exit(main())
