"""Utilidad interactiva para reiniciar la base de datos local.

Requiere haber creado previamente el entorno virtual en backend/ENV.
Al ejecutarse, delega en `scripts/setup/reset_db.py`, que elimina
`backend/db.sqlite3` y vuelve a aplicar migraciones limpias.

Uso recomendado (desde la raíz del repositorio):

    python scripts/development/reset_local_data.py

El script solicita confirmación antes de continuar.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
PYTHON_EXECUTABLE = BACKEND_DIR / "ENV" / "Scripts" / "python.exe"
RESET_SCRIPT = REPO_ROOT / "scripts" / "setup" / "reset_db.py"


def ensure_prerequisites() -> None:
    if not PYTHON_EXECUTABLE.exists():
        raise FileNotFoundError(
            "No se encontró el intérprete en backend/ENV/Scripts/python.exe. "
            "Ejecuta primero el proceso de inicialización para crear el entorno virtual."
        )
    if not RESET_SCRIPT.exists():
        raise FileNotFoundError(
            "No se encontró scripts/setup/reset_db.py. Verifica que el repositorio esté completo."
        )


def main() -> None:
    ensure_prerequisites()

    print("\n⚠️  Esta acción eliminará backend/db.sqlite3 y volverá a ejecutar las migraciones.")
    confirm = input("¿Deseas continuar? (escribe SI en mayúsculas): ").strip()
    if confirm != "SI":
        print("Operación cancelada.")
        return

    command = [str(PYTHON_EXECUTABLE), str(RESET_SCRIPT)]
    print("\nEjecutando:")
    print(" ".join(command))

    result = subprocess.run(command, cwd=str(BACKEND_DIR))
    if result.returncode == 0:
        print("\n✅ Base de datos reiniciada con éxito. Puedes volver a correr los scripts de seed.")
    else:
        print("\n❌ Hubo problemas al reiniciar la base de datos. Revisa la salida anterior.")
        sys.exit(result.returncode)


if __name__ == "__main__":
    main()
