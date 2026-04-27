"""
CLI para gestionar sprints de Jira en el proyecto SEB.

Subcomandos:
    listar   Lista boards y sus sprints (activos y futuros)
    crear    Crea un sprint nuevo en un board
    iniciar  Inicia un sprint (state -> active)
    cerrar   Cierra el sprint activo de un board (state -> closed)
    mover    Mueve issues a un sprint existente

Uso:
    python dev/scripts/jira/gestionar_sprint.py listar

    python dev/scripts/jira/gestionar_sprint.py crear \\
        --board-id 42 --name "Sprint 12" --goal "Mejorar emails" \\
        --start-date 2026-04-28T09:00:00.000Z --end-date 2026-05-11T18:00:00.000Z

    python dev/scripts/jira/gestionar_sprint.py iniciar \\
        --sprint-id 150 --start-date 2026-04-28T09:00:00.000Z --end-date 2026-05-11T18:00:00.000Z

    python dev/scripts/jira/gestionar_sprint.py cerrar --sprint-id 150

    python dev/scripts/jira/gestionar_sprint.py mover \\
        --sprint-id 150 --issues SEB-210 SEB-211 SEB-212
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jira_client import JiraClient


# ------------------------------------------------------------------ #
# Comandos
# ------------------------------------------------------------------ #

def cmd_listar(args):
    client = JiraClient()
    boards = client.get_boards()
    if not boards:
        print("No se encontraron tableros para el proyecto SEB.")
        return

    for board in boards:
        print(f"\nBoard [{board['id']}]  {board['name']}  ({board.get('type', '?')})")
        for state in ("active", "future"):
            sprints = client.get_sprints(board["id"], state=state)
            for s in sprints:
                dates = ""
                if s.get("startDate") and s.get("endDate"):
                    dates = f"  {s['startDate'][:10]} -> {s['endDate'][:10]}"
                goal = f"  [{s['goal']}]" if s.get("goal") else ""
                print(f"  [{s['state'].upper():7}] id={s['id']:>5}  {s['name']}{dates}{goal}")


def cmd_crear(args):
    client = JiraClient()
    sprint = client.create_sprint(
        board_id=args.board_id,
        name=args.name,
        goal=args.goal,
        start_date=args.start_date,
        end_date=args.end_date,
    )
    print(f"\nSprint creado:")
    print(f"  ID:     {sprint['id']}")
    print(f"  Nombre: {sprint['name']}")
    print(f"  Estado: {sprint.get('state', 'future')}")
    if sprint.get("goal"):
        print(f"  Objetivo: {sprint['goal']}")


def cmd_iniciar(args):
    client = JiraClient()
    updated = client.update_sprint(
        args.sprint_id,
        state="active",
        startDate=args.start_date,
        endDate=args.end_date,
    )
    print(f"\nSprint {args.sprint_id} iniciado.")
    print(f"  Nombre: {updated.get('name')}")
    print(f"  Estado: {updated.get('state')}")
    if updated.get("startDate"):
        print(f"  Inicio: {updated['startDate'][:10]}")
    if updated.get("endDate"):
        print(f"  Cierre: {updated['endDate'][:10]}")


def cmd_cerrar(args):
    client = JiraClient()
    updated = client.update_sprint(args.sprint_id, state="closed")
    print(f"\nSprint {args.sprint_id} cerrado.")
    print(f"  Nombre: {updated.get('name')}")
    print(f"  Estado: {updated.get('state')}")


def cmd_mover(args):
    client = JiraClient()
    client.move_issues_to_sprint(args.sprint_id, args.issues)
    print(f"\n{len(args.issues)} issue(s) movida(s) al sprint {args.sprint_id}:")
    for key in args.issues:
        print(f"  {key}  {client.issue_url(key)}")


# ------------------------------------------------------------------ #
# Parser
# ------------------------------------------------------------------ #

def parse_args():
    parser = argparse.ArgumentParser(
        description="Gestiona sprints de Jira para el proyecto SEB"
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # listar
    sub.add_parser("listar", help="Lista boards y sus sprints activos/futuros")

    # crear
    p_crear = sub.add_parser("crear", help="Crea un sprint nuevo (estado: future)")
    p_crear.add_argument("--board-id", type=int, required=True, help="ID del board (ver listar)")
    p_crear.add_argument("--name", required=True, help='Nombre del sprint (ej: "Sprint 12")')
    p_crear.add_argument("--goal", default=None, help="Objetivo del sprint")
    p_crear.add_argument(
        "--start-date", default=None, help="Fecha inicio ISO 8601 (ej: 2026-04-28T09:00:00.000Z)"
    )
    p_crear.add_argument(
        "--end-date", default=None, help="Fecha cierre ISO 8601 (ej: 2026-05-11T18:00:00.000Z)"
    )

    # iniciar
    p_iniciar = sub.add_parser("iniciar", help="Inicia un sprint (state -> active)")
    p_iniciar.add_argument("--sprint-id", type=int, required=True, help="ID del sprint")
    p_iniciar.add_argument(
        "--start-date", required=True, help="Fecha inicio ISO 8601"
    )
    p_iniciar.add_argument(
        "--end-date", required=True, help="Fecha cierre ISO 8601"
    )

    # cerrar
    p_cerrar = sub.add_parser("cerrar", help="Cierra un sprint (state -> closed)")
    p_cerrar.add_argument("--sprint-id", type=int, required=True, help="ID del sprint")

    # mover
    p_mover = sub.add_parser("mover", help="Mueve issues a un sprint")
    p_mover.add_argument("--sprint-id", type=int, required=True, help="ID del sprint destino")
    p_mover.add_argument(
        "--issues", nargs="+", required=True, help="Keys de issues (ej: SEB-210 SEB-211)"
    )

    return parser.parse_args()


# ------------------------------------------------------------------ #
# Entry point
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    args = parse_args()
    CMDS = {
        "listar": cmd_listar,
        "crear": cmd_crear,
        "iniciar": cmd_iniciar,
        "cerrar": cmd_cerrar,
        "mover": cmd_mover,
    }
    try:
        CMDS[args.cmd](args)
    except (ValueError, RuntimeError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
