"""
Lista los tipos de issue disponibles en un proyecto Jira.

Uso:
    python dev/scripts/jira/listar_tipos_issues.py --project SEB

Argumentos:
    --project Key del proyecto Jira (ej: SEB)
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


def parse_args():
    parser = argparse.ArgumentParser(description="Lista los tipos de issue disponibles en un proyecto Jira")
    parser.add_argument("--project", required=True, help="Key del proyecto (ej: SEB)")
    return parser.parse_args()


def main():
    args = parse_args()
    client = JiraClient()

    print(f"\nConectando a {client.base_url} como {client.email}...")
    issue_types = client.get_issue_types(args.project)

    if not issue_types:
        print(f"No se encontraron tipos de issue para el proyecto '{args.project}'.")
        return

    print(f"\nTipos de issue disponibles en {args.project}:")
    print(f"{'NOMBRE':<30} {'ID':<12} {'SUBTASK':<8} {'DESCRIPCION'}")
    print("-" * 80)
    for issue_type in issue_types:
        name = issue_type.get("name", "")
        type_id = issue_type.get("id", "")
        subtask = str(issue_type.get("subtask", False))
        description = issue_type.get("description", "")
        print(f"{name:<30} {type_id:<12} {subtask:<8} {description}")

    print(f"\nTotal: {len(issue_types)} tipo(s) de issue")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
