"""
Cliente Jira reutilizable para el monorepo ERP Snabbit.
Lee credenciales desde backend/.env via python-dotenv.
Usa stdlib (urllib) para no agregar dependencias nuevas.
"""

import json
import base64
import os
import urllib.request
import urllib.error
from pathlib import Path

from dotenv import load_dotenv

# Ruta al .env del backend (dev/scripts/jira/ -> dev/scripts/ -> dev/ -> raiz/ -> backend/)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / "backend" / ".env"
load_dotenv(_ENV_PATH)


# Proyecto autorizado para todas las operaciones de creacion/modificacion
ALLOWED_PROJECT = "SEB"  # Software ERP Monorepo


class JiraClient:
    """Cliente HTTP para la API REST v3 de Jira Cloud.

    Todas las operaciones de escritura estan restringidas al proyecto
    'SEB' (Software ERP Monorepo). Intentar operar sobre otro proyecto
    lanzara ValueError antes de realizar cualquier llamada a la API.
    """

    def __init__(self):
        self.base_url = os.getenv("JIRA_BASE_URL", "").rstrip("/")
        self.email = os.getenv("JIRA_EMAIL", "")
        self.token = os.getenv("JIRA_API_TOKEN", "")

        faltantes = [
            nombre
            for nombre, valor in [
                ("JIRA_BASE_URL", self.base_url),
                ("JIRA_EMAIL", self.email),
                ("JIRA_API_TOKEN", self.token),
            ]
            if not valor
        ]
        if faltantes:
            raise ValueError(
                f"Variables faltantes en backend/.env: {', '.join(faltantes)}"
            )

        credentials = f"{self.email}:{self.token}"
        self._auth_header = "Basic " + base64.b64encode(credentials.encode()).decode()

    def _request(self, method: str, path: str, data: dict = None) -> dict:
        """Ejecuta una llamada a la API REST de Jira."""
        url = f"{self.base_url}/rest/api/3{path}"
        headers = {
            "Authorization": self._auth_header,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8")
            raise RuntimeError(
                f"HTTP {exc.code} al llamar {method} {url}\n{error_body}"
            ) from exc

    # ------------------------------------------------------------------ #
    # Metodos de consulta
    # ------------------------------------------------------------------ #

    def test_connection(self) -> dict:
        """Verifica la conexion retornando el perfil del usuario autenticado."""
        return self._request("GET", "/myself")

    def get_projects(self) -> list:
        """Lista todos los proyectos accesibles."""
        result = self._request("GET", "/project")
        return result if isinstance(result, list) else result.get("values", [])

    def get_issue_types(self, project_key: str) -> list:
        """Retorna los tipos de issue disponibles en un proyecto."""
        project = self._request("GET", f"/project/{project_key}")
        return project.get("issueTypes", [])

    def get_issue(self, issue_key: str) -> dict:
        """Retorna el detalle de una issue por su key (ej: PROJ-123)."""
        return self._request("GET", f"/issue/{issue_key}")

    # ------------------------------------------------------------------ #
    # Metodos de creacion
    # ------------------------------------------------------------------ #

    def _validar_proyecto(self, project_key: str) -> None:
        """Lanza ValueError si el proyecto no es el autorizado (SEB)."""
        if project_key.upper() != ALLOWED_PROJECT:
            raise ValueError(
                f"Proyecto '{project_key}' no autorizado. "
                f"Solo se permite operar sobre '{ALLOWED_PROJECT}' (Software ERP Monorepo)."
            )

    def create_issue(
        self,
        project_key: str,
        summary: str,
        description: str,
        issue_type: str,
        parent_key: str = None,
        labels: list = None,
    ) -> dict:
        """
        Crea una issue en Jira. Solo permite el proyecto SEB (Software ERP Monorepo).

        Args:
            project_key:  Key del proyecto — debe ser 'SEB'
            summary:      Titulo de la issue
            description:  Descripcion en texto plano
            issue_type:   "Epic", "Story" o "Task"
            parent_key:   Key de la issue padre (para vincular historia a epica)
            labels:       Lista de etiquetas (ej: ["backend"] o ["frontend"])

        Returns:
            dict con 'id', 'key' y 'self' de la issue creada
        """
        self._validar_proyecto(project_key)
        fields = {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}],
                    }
                ],
            },
            "issuetype": {"name": issue_type},
        }

        if parent_key:
            fields["parent"] = {"key": parent_key}

        if labels:
            fields["labels"] = labels

        return self._request("POST", "/issue", {"fields": fields})

    def link_issues(
        self, inward_key: str, outward_key: str, link_type: str = "Blocks"
    ) -> dict:
        """
        Crea un enlace entre dos issues.

        Args:
            inward_key:  Issue que bloquea / depende
            outward_key: Issue bloqueada / dependiente
            link_type:   Tipo de enlace ("Blocks", "Cloners", etc.)
        """
        data = {
            "type": {"name": link_type},
            "inwardIssue": {"key": inward_key},
            "outwardIssue": {"key": outward_key},
        }
        return self._request("POST", "/issueLink", data)

    # ------------------------------------------------------------------ #
    # API Agile (sprints, tableros)
    # ------------------------------------------------------------------ #

    def _agile_request(self, method: str, path: str, data: dict = None) -> dict:
        """Ejecuta una llamada a la API Agile v1.0 de Jira (/rest/agile/1.0/)."""
        url = f"{self.base_url}/rest/agile/1.0{path}"
        headers = {
            "Authorization": self._auth_header,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8")
            raise RuntimeError(
                f"HTTP {exc.code} al llamar {method} {url}\n{error_body}"
            ) from exc

    def get_boards(self, project_key: str = ALLOWED_PROJECT) -> list:
        """Lista los tableros (boards) asociados a un proyecto Jira."""
        result = self._agile_request("GET", f"/board?projectKeyOrId={project_key}")
        return result.get("values", [])

    def get_sprints(self, board_id: int, state: str = None) -> list:
        """
        Lista los sprints de un tablero.

        Args:
            board_id: ID del tablero (obtenido via get_boards)
            state:    Filtro opcional: "active", "future" o "closed"
        """
        path = f"/board/{board_id}/sprint"
        if state:
            path += f"?state={state}"
        result = self._agile_request("GET", path)
        return result.get("values", [])

    def get_active_sprint(self, board_id: int):
        """Retorna el sprint activo de un tablero, o None si no hay ninguno."""
        sprints = self.get_sprints(board_id, state="active")
        return sprints[0] if sprints else None

    def create_sprint(
        self,
        board_id: int,
        name: str,
        goal: str = None,
        start_date: str = None,
        end_date: str = None,
    ) -> dict:
        """
        Crea un sprint en el tablero indicado (queda en estado 'future').

        Args:
            board_id:    ID del tablero (ver get_boards)
            name:        Nombre del sprint (ej: "Sprint 12")
            goal:        Objetivo del sprint (opcional)
            start_date:  Fecha inicio ISO 8601 (ej: "2026-04-28T09:00:00.000Z")
            end_date:    Fecha cierre ISO 8601 (ej: "2026-05-11T18:00:00.000Z")
        """
        data = {"name": name, "originBoardId": board_id}
        if goal:
            data["goal"] = goal
        if start_date:
            data["startDate"] = start_date
        if end_date:
            data["endDate"] = end_date
        return self._agile_request("POST", "/sprint", data)

    def update_sprint(self, sprint_id: int, **kwargs) -> dict:
        """
        Actualiza campos de un sprint existente.

        Kwargs admitidos: name, goal, state, startDate, endDate.
        - Iniciar sprint:  state="active" + startDate + endDate
        - Cerrar sprint:   state="closed"
        """
        return self._agile_request("PUT", f"/sprint/{sprint_id}", kwargs)

    def move_issues_to_sprint(self, sprint_id: int, issue_keys: list) -> None:
        """Mueve una lista de issues a un sprint."""
        self._agile_request("POST", f"/sprint/{sprint_id}/issue", {"issues": issue_keys})

    # ------------------------------------------------------------------ #
    # Helpers de presentacion
    # ------------------------------------------------------------------ #

    def issue_url(self, issue_key: str) -> str:
        """Retorna la URL de navegador para una issue."""
        return f"{self.base_url}/browse/{issue_key}"
