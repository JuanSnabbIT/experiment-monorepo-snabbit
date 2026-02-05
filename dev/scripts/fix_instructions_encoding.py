#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para corregir encoding UTF-8 corrupto en archivos de instrucciones.
Uso: python fix_instructions_encoding.py
"""

import os
from pathlib import Path

# Mapeo de caracteres corruptos a correctos
REPLACEMENTS = {
    '├ì': 'Í',
    '├®': 'é',
    '├º': 'ú',
    '├¡': 'á',
    '├│': 'ó',
    '├¡': 'í',
    '├Ü': 'Ú',
    '├ô': 'Ó',
    '┬┐': '¿',
    'Ôö£ÔöÇÔöÇ': '├──',
    'ÔööÔöÇÔöÇ': '└──',
    'Ôöé': '│',
    'ÔåÆ': '→',
    'ÔÜá´©Å': '⚠️',
    '├ìTICO': 'ÍTICO',
    'Est├índares': 'Estándares',
    't├®rminos': 'términos',
    't├®cnico': 'técnico',
    't├®cnicos': 'técnicos',
}

def fix_encoding(text):
    """Corrige caracteres UTF-8 corruptos en texto."""
    for wrong, correct in REPLACEMENTS.items():
        text = text.replace(wrong, correct)
    return text

def fix_file(filepath):
    """Corrige encoding de un archivo específico."""
    print(f"Procesando: {filepath}")
    try:
        # Leer con encoding que interpreta incorrectamente
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Aplicar correcciones
        fixed_content = fix_encoding(content)
        
        # Escribir correctamente
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print(f"✓ Corregido: {filepath}")
        return True
    except Exception as e:
        print(f"✗ Error en {filepath}: {e}")
        return False

def main():
    # Directorio base
    base_dir = Path(__file__).resolve().parent.parent.parent
    instructions_dir = base_dir / '.github' / 'instructions'
    copilot_file = base_dir / '.github' / 'copilot-instructions.md'
    
    print("=== Corrección de Encoding UTF-8 ===\n")
    
    # Corregir copilot-instructions.md
    if copilot_file.exists():
        fix_file(copilot_file)
    
    # Corregir todos los archivos en instructions/
    if instructions_dir.exists():
        for filepath in instructions_dir.glob('*.md'):
            fix_file(filepath)
    
    print("\n=== Proceso completado ===")

if __name__ == '__main__':
    main()
