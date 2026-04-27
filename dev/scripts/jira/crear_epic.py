"""
Crea una Epica en Jira.

Uso:
    python dev/scripts/jira/crear_epic.py --project SNAB --summary "Mi Epica" --description "Descripcion"

Argumentos:
    --project       Key del proyecto Jira (ej: SNAB)
    --summary       Titulo de la epica (requerido)
    --description   Descripcion (opcional, default: vacio)
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


def parse_args():
    parser = argparse.ArgumentParser(description="Crea una Epica en Jira")
    parser.add_argument("--project", required=True, help="Key del proyecto (ej: SNAB)")
    parser.add_argument("--summary", required=True, help="Titulo de la epica")
    parser.add_argument(
        "--description", default="", help="Descripcion de la epica (opcional)"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    client = JiraClient()

    print(f"\nCreando epica en proyecto '{args.project}'...")
    result = client.create_issue(
        project_key=args.project,
        summary=args.summary,
        description=args.description or args.summary,
        issue_type="Epic",
    )

    key = result.get("key")
    url = client.issue_url(key)
    print(f"\nEpica creada: {key}")
    print(f"URL: {url}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
