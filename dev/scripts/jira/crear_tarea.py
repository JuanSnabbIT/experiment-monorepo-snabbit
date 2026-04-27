"""
Crea una Tarea en Jira vinculada a una Historia o Epica padre.

El argumento --tipo es OBLIGATORIO y determina el prefijo del titulo y la etiqueta:
    frontend  ->  titulo: "Front: <summary>"  |  etiqueta: frontend
    backend   ->  titulo: "Back: <summary>"   |  etiqueta: backend

Uso:
    python dev/scripts/jira/crear_tarea.py \
        --project SEB \
        --tipo backend \
        --summary "Implementar endpoint GET /api/ordenes/" \
        --description "Detalle tecnico de la tarea" \
        --parent-key SEB-2

Argumentos:
    --project       Key del proyecto Jira (debe ser SEB)
    --tipo          Tipo de tarea: 'frontend' o 'backend' (requerido)
    --summary       Titulo de la tarea sin prefijo (requerido)
    --description   Descripcion tecnica (opcional)
    --parent-key    Key de la issue padre - historia o epica (opcional)
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient

TIPOS = {
    "frontend": {"prefijo": "Front", "label": "frontend"},
    "backend":  {"prefijo": "Back",  "label": "backend"},
}


def parse_args():
    parser = argparse.ArgumentParser(description="Crea una Tarea en Jira")
    parser.add_argument("--project", required=True, help="Key del proyecto (debe ser SEB)")
    parser.add_argument(
        "--tipo",
        required=True,
        choices=list(TIPOS.keys()),
        help="Tipo de tarea: 'frontend' o 'backend'",
    )
    parser.add_argument("--summary", required=True, help="Titulo sin prefijo (ej: 'Implementar vista de OT')")
    parser.add_argument(
        "--description", default="", help="Descripcion tecnica de la tarea"
    )
    parser.add_argument(
        "--parent-key",
        default=None,
        help="Key de la issue padre - historia o epica (ej: SEB-2)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = TIPOS[args.tipo]

    summary_final = f"{config['prefijo']}: {args.summary}"
    label = config["label"]

    client = JiraClient()

    print(f"\nCreando tarea [{args.tipo.upper()}] en proyecto '{args.project}'...")
    print(f"Titulo: {summary_final}")
    print(f"Etiqueta: {label}")
    if args.parent_key:
        print(f"Vinculando a padre: {args.parent_key}")

    # Jerarquia SEB: Epic > Historia > Subtarea / Epic > Tarea (directo)
    # Si tiene padre (Historia), usar Subtarea; sin padre, usar Tarea
    issue_type = "Subtarea" if args.parent_key else "Tarea"

    result = client.create_issue(
        project_key=args.project,
        summary=summary_final,
        description=args.description or args.summary,
        issue_type=issue_type,
        parent_key=args.parent_key,
        labels=[label],
    )

    key = result.get("key")
    url = client.issue_url(key)
    print(f"\nTarea creada: {key}")
    print(f"URL: {url}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
