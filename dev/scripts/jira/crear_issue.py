"""
Crea una issue genérica en Jira.

Uso:
    python dev/scripts/jira/crear_issue.py --project SEB --summary "Implementar validación de inputs" --description "Detalle de la tarea" --issue-type "Bug" --parent-key SEB-12 --labels backend security

Argumentos:
    --project     Key del proyecto Jira (ej: SEB)
    --summary     Titulo de la issue (requerido)
    --description Descripcion de la issue (opcional)
    --issue-type  Tipo de issue disponible en el proyecto (requerido)
    --parent-key  Key de la issue padre para subtareas (opcional)
    --labels      Lista de etiquetas separadas por espacio (opcional)
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


def parse_args():
    parser = argparse.ArgumentParser(description="Crea una issue genérica en Jira")
    parser.add_argument("--project", required=True, help="Key del proyecto (ej: SEB)")
    parser.add_argument("--summary", required=True, help="Titulo de la issue")
    parser.add_argument(
        "--description",
        default="",
        help="Descripcion de la issue (opcional)",
    )
    parser.add_argument(
        "--issue-type",
        required=True,
        help="Tipo de issue disponible en el proyecto (ej: Epic, Historia, Bug, Tarea, Subtarea)",
    )
    parser.add_argument(
        "--parent-key",
        default=None,
        help="Key de la issue padre para subtareas (opcional)",
    )
    parser.add_argument(
        "--labels",
        nargs="+",
        default=None,
        help="Etiquetas separadas por espacio (opcional)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    client = JiraClient()

    print()
    print(f"Creando issue en proyecto '{args.project}'...")
    print(f"Tipo de issue: {args.issue_type}")
    if args.parent_key:
        print(f"Parent: {args.parent_key}")
    if args.labels:
        print(f"Labels: {', '.join(args.labels)}")

    result = client.create_issue(
        project_key=args.project,
        summary=args.summary,
        description=args.description or args.summary,
        issue_type=args.issue_type,
        parent_key=args.parent_key,
        labels=args.labels,
    )

    key = result.get("key")
    url = client.issue_url(key)
    print()
    print(f"Issue creada: {key}")
    print(f"URL: {url}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print()
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
