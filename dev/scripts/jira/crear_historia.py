"""
Crea una Historia de usuario en Jira, opcionalmente vinculada a una Epica.

Uso:
    python dev/scripts/jira/crear_historia.py \
        --project SNAB \
        --summary "Como usuario quiero..." \
        --description "Criterios de aceptacion" \
        --epic-key SNAB-1

Argumentos:
    --project       Key del proyecto Jira (ej: SNAB)
    --summary       Titulo de la historia (requerido)
    --description   Descripcion / criterios de aceptacion (opcional)
    --epic-key      Key de la epica padre (opcional, ej: SNAB-1)
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


def parse_args():
    parser = argparse.ArgumentParser(description="Crea una Historia de usuario en Jira")
    parser.add_argument("--project", required=True, help="Key del proyecto (ej: SNAB)")
    parser.add_argument("--summary", required=True, help="Titulo de la historia")
    parser.add_argument(
        "--description", default="", help="Descripcion / criterios de aceptacion"
    )
    parser.add_argument(
        "--epic-key", default=None, help="Key de la epica padre (ej: SNAB-1)"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    client = JiraClient()

    print(f"\nCreando historia en proyecto '{args.project}'...")
    if args.epic_key:
        print(f"Vinculando a epica: {args.epic_key}")

    result = client.create_issue(
        project_key=args.project,
        summary=args.summary,
        description=args.description or args.summary,
        issue_type="Historia",
        parent_key=args.epic_key,
    )

    key = result.get("key")
    url = client.issue_url(key)
    print(f"\nHistoria creada: {key}")
    print(f"URL: {url}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
