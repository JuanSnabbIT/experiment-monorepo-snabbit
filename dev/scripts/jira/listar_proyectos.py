"""
Lista todos los proyectos Jira accesibles con la cuenta configurada en backend/.env.

Uso:
    python dev/scripts/jira/listar_proyectos.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


def main():
    client = JiraClient()

    print(f"\nConectando a {client.base_url} como {client.email}...")
    me = client.test_connection()
    print(f"Autenticado como: {me.get('displayName', client.email)}\n")

    proyectos = client.get_projects()

    if not proyectos:
        print("No se encontraron proyectos accesibles.")
        return

    print(f"{'KEY':<12} {'NOMBRE':<40} {'TIPO'}")
    print("-" * 70)
    for p in proyectos:
        key = p.get("key", "")
        nombre = p.get("name", "")
        tipo = p.get("projectTypeKey", "")
        print(f"{key:<12} {nombre:<40} {tipo}")

    print(f"\nTotal: {len(proyectos)} proyecto(s)")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
