"""Mixins reutilizables para manipular JSONField por bloques."""

from typing import Any


class JsonBlockMixin:
    """Mixin para leer/mutar bloques JSON via dot-path."""

    def _resolve_path(self, data: dict, path: str) -> tuple[Any, Any, str | int]:
        if not path:
            raise KeyError("Path vacio")

        keys = path.split(".")
        parent, current = None, data

        for key in keys:
            parent = current
            if isinstance(current, list):
                try:
                    key = int(key)
                except ValueError as exc:
                    raise KeyError(f"Se esperaba indice entero, se recibio '{key}'") from exc

            try:
                current = current[key]
            except (KeyError, IndexError, TypeError) as exc:
                raise KeyError(f"Path invalido en '{key}': {exc}") from exc

        last_key = keys[-1] if not isinstance(parent, list) else int(keys[-1])
        return parent, current, last_key

    def get_block(self, data: dict, path: str) -> Any:
        _, value, _ = self._resolve_path(data, path)
        return value

    def set_block(self, data: dict, path: str, value: Any) -> dict:
        keys = path.split(".")
        current: Any = data

        for key in keys[:-1]:
            if isinstance(current, list):
                key = int(key)
            current = current[key]

        last = keys[-1]
        if isinstance(current, list):
            current[int(last)] = value
        else:
            current[last] = value
        return data

    def delete_block(self, data: dict, path: str) -> dict:
        parent, _, last = self._resolve_path(data, path)
        if isinstance(parent, list):
            parent.pop(last)
        else:
            del parent[last]
        return data

    def append_to_block(self, data: dict, path: str, value: Any) -> dict:
        _, target, _ = self._resolve_path(data, path)
        if not isinstance(target, list):
            raise ValueError(f"El bloque en '{path}' no es una lista")
        target.append(value)
        return data