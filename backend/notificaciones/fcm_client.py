"""Cliente Firebase Admin SDK para envio de push.

Centraliza la inicializacion del SDK y el envio de mensajes a tokens FCM.
Las credenciales se pueden cargar de tres formas (en orden de prioridad):
  1. `FIREBASE_CREDENTIALS_JSON`: contenido JSON inline de la service account.
  2. `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
  3. `FIREBASE_CREDENTIALS_PATH`: ruta a un archivo JSON de service account.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from typing import Iterable

from django.conf import settings

logger = logging.getLogger(__name__)

_init_lock = threading.Lock()
_initialized = False


def _ensure_initialized() -> bool:
    """Inicializa firebase_admin una sola vez. Retorna True si quedo listo."""
    global _initialized
    if _initialized:
        return True

    with _init_lock:
        if _initialized:
            return True

        try:
            import firebase_admin  # type: ignore
            from firebase_admin import credentials  # type: ignore
        except ImportError:
            logger.warning(
                "firebase-admin no esta instalado; los push se omitiran. "
                "Instalar con: pip install firebase-admin"
            )
            return False

        cred = _resolver_credenciales(credentials)
        if cred is None:
            logger.warning(
                "Credenciales Firebase no configuradas; push deshabilitado. "
                "Define FIREBASE_CREDENTIALS_JSON, FIREBASE_PROJECT_ID+CLIENT_EMAIL+PRIVATE_KEY, "
                "o FIREBASE_CREDENTIALS_PATH."
            )
            return False

        try:
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _initialized = True
            logger.info("Firebase Admin SDK inicializado correctamente.")
            return True
        except Exception:
            logger.exception("Error inicializando Firebase Admin SDK.")
            return False


def _resolver_credenciales(credentials):
    """Resuelve credenciales en orden: JSON inline > vars sueltas > path archivo."""
    # 1) JSON inline
    cred_json = getattr(settings, "FIREBASE_CREDENTIALS_JSON", None) or os.getenv(
        "FIREBASE_CREDENTIALS_JSON"
    )
    if cred_json:
        try:
            data = json.loads(cred_json)
            return credentials.Certificate(data)
        except Exception:
            logger.exception("FIREBASE_CREDENTIALS_JSON no se pudo parsear como JSON valido.")
            return None

    # 2) Variables sueltas (3 campos minimos)
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None) or os.getenv("FIREBASE_PROJECT_ID")
    client_email = getattr(settings, "FIREBASE_CLIENT_EMAIL", None) or os.getenv(
        "FIREBASE_CLIENT_EMAIL"
    )
    private_key = getattr(settings, "FIREBASE_PRIVATE_KEY", None) or os.getenv(
        "FIREBASE_PRIVATE_KEY"
    )
    if project_id and client_email and private_key:
        # Soporta \n literales escapados en .env
        private_key = private_key.replace("\\n", "\n")
        data = {
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        try:
            return credentials.Certificate(data)
        except Exception:
            logger.exception("Error construyendo credenciales desde variables sueltas.")
            return None

    # 3) Path a archivo JSON
    cred_path = getattr(settings, "FIREBASE_CREDENTIALS_PATH", None) or os.getenv(
        "FIREBASE_CREDENTIALS_PATH"
    )
    if cred_path and os.path.exists(cred_path):
        try:
            return credentials.Certificate(cred_path)
        except Exception:
            logger.exception("Error cargando credenciales desde %s.", cred_path)
            return None

    return None


def enviar_push_a_tokens(
    tokens: Iterable[str],
    titulo: str,
    cuerpo: str,
    url_destino: str = "",
    datos: dict | None = None,
) -> tuple[list[str], list[str]]:
    """Envia un push a una lista de tokens FCM.

    Retorna (tokens_invalidos, tokens_exitosos). Los tokens_invalidos deben
    marcarse como `activo=False` en la base de datos para no reintentar.

    Si Firebase no esta configurado, retorna ([], []) sin error.
    """
    tokens_list = [t for t in tokens if t]
    if not tokens_list:
        return [], []

    if not _ensure_initialized():
        return [], []

    try:
        from firebase_admin import messaging  # type: ignore
    except ImportError:
        return [], []

    payload_data = {
        "url_destino": url_destino or "",
    }
    if datos:
        # Firebase exige todos los valores como strings.
        payload_data.update({str(k): str(v) for k, v in datos.items()})

    # WebpushFCMOptions.link exige HTTPS absoluta. Resolvemos la URL o la omitimos.
    webpush_link: str | None = None
    if url_destino:
        if url_destino.startswith("https://"):
            webpush_link = url_destino
        elif url_destino.startswith("/"):
            base = getattr(settings, "FRONTEND_URL", "") or ""
            if base.startswith("https://"):
                webpush_link = base.rstrip("/") + url_destino
            # Si el entorno no tiene FRONTEND_URL con HTTPS (ej. localhost), omitimos el link.

    message = messaging.MulticastMessage(
        tokens=tokens_list,
        notification=messaging.Notification(title=titulo, body=cuerpo),
        data=payload_data,
        webpush=messaging.WebpushConfig(
            fcm_options=messaging.WebpushFCMOptions(link=webpush_link) if webpush_link else None
        ),
    )

    try:
        response = messaging.send_each_for_multicast(message)
    except Exception:
        logger.exception("Error enviando push FCM (lote de %s tokens).", len(tokens_list))
        return [], []

    invalidos: list[str] = []
    exitosos: list[str] = []
    for token, resp in zip(tokens_list, response.responses):
        if resp.success:
            exitosos.append(token)
            continue
        err = resp.exception
        # Codigos que indican token invalido y deben removerse.
        codigo = getattr(err, "code", "") if err else ""
        if codigo in {"registration-token-not-registered", "invalid-argument", "invalid-registration-token"}:
            invalidos.append(token)
        else:
            logger.warning("Push FCM fallo (token=%s...): %s", token[:12], err)

    return invalidos, exitosos
