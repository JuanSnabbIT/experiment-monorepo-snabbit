#!/usr/bin/env python
"""
Script orquestador que ejecuta todos los scripts de seed en orden correcto.

Qué hace:
- Ejecuta secuencialmente todos los scripts de seed en el orden de dependencias
- Verifica éxito de cada script antes de continuar
- Proporciona resumen completo al finalizar

Cuándo usar:
- Después de reset_db.py para poblar sistema desde cero
- Primera inicialización del sistema
- Testing con datos completos

Prerequisitos:
- Base de datos resetada (reset_db.py)
- Scripts de seed existentes en scripts/setup/

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_completo.py

Salida:
    - Ejecuta cada script en orden
    - Muestra progreso de cada script
    - Detiene ejecución si algún script falla
    - Resumen final con totales creados
"""
import os
import subprocess
import sys
from pathlib import Path

# Rutas
BACKEND_PATH = Path(__file__).parents[2] / "backend"
SCRIPTS_DIR = Path(__file__).parent
PYTHON_EXE = BACKEND_PATH / "ENV" / "Scripts" / "python.exe"

# Scripts a ejecutar en orden de dependencias
SEED_SCRIPTS = [
    {
        "name": "setup_superuser.py",
        "description": "Crear superusuario y empresa base (11111111-1)",
        "required": True,
    },
    {
        "name": "seed_data.py",
        "description": "Poblar empresas, usuarios, items, bodegas, categorías",
        "required": True,
    },
    {
        "name": "seed_servicios.py",
        "description": "Poblar servicios, planes y características",
        "required": True,
    },
    {
        "name": "seed_contratos_extras.py",
        "description": "Poblar visitas, licencias y condiciones especiales",
        "required": True,
    },
    {
        "name": "seed_categorias_gastos.py",
        "description": "Poblar categorías de gastos para rendiciones",
        "required": True,
    },
    {
        "name": "seed_acuerdos_confidencialidad.py",
        "description": "Poblar plantillas de acuerdos de confidencialidad (NDA)",
        "required": True,
    },
]


def print_header(text):
    """Imprime encabezado con formato."""
    print("\n" + "=" * 80)
    print(text.center(80))
    print("=" * 80)


def print_step(step_num, total_steps, script_name, description):
    """Imprime información del paso actual."""
    print(f"\n{'=' * 80}")
    print(f"PASO {step_num}/{total_steps}: {script_name}")
    print(f"Descripción: {description}")
    print(f"{'=' * 80}")


def run_script(script_path):
    """Ejecuta un script y retorna True si tuvo éxito."""
    result = subprocess.run(
        [str(PYTHON_EXE), str(script_path)],
        cwd=str(BACKEND_PATH),
        capture_output=False,
    )
    return result.returncode == 0


def main():
    print_header("SEED COMPLETO - Poblando todos los catálogos del sistema")

    print("\n📋 Scripts a ejecutar:")
    for i, script in enumerate(SEED_SCRIPTS, 1):
        status = "✅ Requerido" if script["required"] else "⚠️ Opcional"
        print(f"   {i}. {script['name']:30} - {script['description']} [{status}]")

    # Verificar que existan todos los scripts
    missing_scripts = []
    for script in SEED_SCRIPTS:
        script_path = SCRIPTS_DIR / script["name"]
        if not script_path.exists():
            missing_scripts.append(script["name"])

    if missing_scripts:
        print("\n❌ ERROR: Los siguientes scripts no existen:")
        for script_name in missing_scripts:
            print(f"   - {script_name}")
        print(f"\nRuta esperada: {SCRIPTS_DIR}")
        sys.exit(1)

    # Ejecutar scripts
    total_scripts = len(SEED_SCRIPTS)
    successful = 0
    failed = []

    for i, script in enumerate(SEED_SCRIPTS, 1):
        script_path = SCRIPTS_DIR / script["name"]

        print_step(i, total_scripts, script["name"], script["description"])

        if run_script(script_path):
            print(f"\n✅ {script['name']} completado exitosamente")
            successful += 1
        else:
            print(f"\n❌ ERROR en {script['name']}")
            failed.append(script["name"])

            if script["required"]:
                print(f"\n⚠️ Este script es REQUERIDO. Deteniendo ejecución.")
                break
            else:
                print(f"\n⚠️ Este script es opcional. Continuando...")

    # Resumen final
    print_header("RESUMEN DE EJECUCIÓN")

    print(f"\n📊 Estadísticas:")
    print(f"   - Scripts ejecutados:    {successful}/{total_scripts}")
    print(f"   - Scripts exitosos:      {successful}")
    print(f"   - Scripts fallidos:      {len(failed)}")

    if failed:
        print(f"\n❌ Scripts que fallaron:")
        for script_name in failed:
            print(f"   - {script_name}")

    if successful == total_scripts:
        print("\n" + "=" * 80)
        print("✅ SEED COMPLETO FINALIZADO CON ÉXITO".center(80))
        print("=" * 80)
        print("\n💡 Próximos pasos:")
        print(
            "   1. Iniciar backend: backend\\ENV\\Scripts\\python.exe backend\\manage.py runserver"
        )
        print("   2. Iniciar frontend: cd frontend && npm run dev")
        print("   3. Acceder al sistema: http://localhost:5173")
        print("   4. Login con superusuario configurado en setup_superuser.py")
        return 0
    else:
        print("\n" + "=" * 80)
        print("⚠️ SEED COMPLETO FINALIZADO CON ERRORES".center(80))
        print("=" * 80)
        print("\n💡 Recomendaciones:")
        print("   1. Revisar errores arriba")
        print("   2. Ejecutar scripts individualmente para debugging")
        print("   3. Verificar prerequisitos de cada script")
        return 1


if __name__ == "__main__":
    sys.exit(main())
