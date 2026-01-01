#!/usr/bin/env python
"""
Reset local database (dev only).

What it does:
- Deletes backend/db.sqlite3
- Runs Django migrations

Usage:
    cd backend
    backend\ENV\Scripts\python.exe ..\dev\scripts\setup\reset_db.py
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = REPO_ROOT / "backend"
DB_PATH = BACKEND_DIR / "db.sqlite3"
PYTHON_EXE = BACKEND_DIR / "ENV" / "Scripts" / "python.exe"
MANAGE_PY = BACKEND_DIR / "manage.py"


def python_exec() -> str:
    if PYTHON_EXE.exists():
        return str(PYTHON_EXE)
    return sys.executable


def confirm_action() -> bool:
    print("WARNING: This will delete ALL local data in db.sqlite3.")
    answer = input("Type YES to continue: ")
    return answer.strip().upper() == "YES"


def delete_db() -> bool:
    if DB_PATH.exists():
        try:
            DB_PATH.unlink()
            print(f"OK: Deleted {DB_PATH}")
            return True
        except Exception as exc:
            print(f"ERROR: Failed to delete database: {exc}")
            return False
    print("OK: Database file not found (already clean)")
    return True


def run_migrations() -> bool:
    print("Running migrations...")
    result = subprocess.run(
        [python_exec(), str(MANAGE_PY), "migrate"],
        cwd=str(BACKEND_DIR),
    )
    if result.returncode == 0:
        print("OK: Migrations completed")
        return True
    print("ERROR: Migrations failed")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset local database (dev only).")
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip interactive confirmation",
    )
    args = parser.parse_args()

    env_confirm = os.environ.get("RESET_DB_CONFIRM", "").lower() in {"1", "true", "yes"}

    if not (args.yes or env_confirm):
        if not confirm_action():
            print("Canceled by user.")
            return 1

    if not delete_db():
        return 1

    if not run_migrations():
        return 1

    print("Next steps:")
    print("1) Create superuser: backend\\ENV\\Scripts\\python.exe manage.py createsuperuser")
    print("2) Run setup: backend\\ENV\\Scripts\\python.exe ..\\dev\\scripts\\setup\\setup_superuser.py")
    print("3) Seed base data: backend\\ENV\\Scripts\\python.exe ..\\dev\\scripts\\setup\\seed_base.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
