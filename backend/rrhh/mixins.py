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


class TrabajadoresClienteMixin:
    """Devuelve lista normalizada de trabajadores de una empresa cliente.

    Combina UsuarioEmpresa confirmados y ContratoTrabajador pendientes
    (usuario_empresa=null) en una forma común consumible por el frontend.
    """

    def get_trabajadores_cliente(self, empresa_cliente_id: int) -> list[dict]:
        from empresas.models import SucursalEmpresa, UsuarioEmpresa
        from rrhh.models import ContratoTrabajador

        sucursal_ids = list(
            SucursalEmpresa.objects.filter(empresa_id=empresa_cliente_id).values_list("id", flat=True)
        )
        # JSONField puede almacenar el ID como int o string
        sucursal_ids_json = [*sucursal_ids, *[str(sid) for sid in sucursal_ids]]

        confirmados = UsuarioEmpresa.objects.filter(
            sucursal__empresa_id=empresa_cliente_id
        ).select_related("usuario", "sucursal")

        pendientes = ContratoTrabajador.objects.filter(
            usuario_empresa__isnull=True,
            datos_trabajador_nuevo__sucursal_id__in=sucursal_ids_json,
        ).exclude(datos_trabajador_nuevo__isnull=True)

        resultado = []

        for ue in confirmados:
            resultado.append({
                "tipo": "confirmado",
                "ref_id": ue.id,
                "nombre": ue.usuario.get_nombre_completo(),
                "email": ue.usuario.email,
                "rut": ue.rut,
                "cargo": ue.cargo or None,
                "sucursal_id": ue.sucursal_id,
                "estado": ue.estado,
                "estado_label": ue.get_estado_display(),
            })

        for ct in pendientes:
            d = ct.datos_trabajador_nuevo or {}
            first = d.get("first_name", "")
            last = d.get("last_name", "")
            nombre_computed = f"{first} {last}".strip() or None
            resultado.append({
                "tipo": "pendiente",
                "ref_id": ct.id,
                "nombre": nombre_computed,
                "email": d.get("email"),
                "rut": d.get("rut"),
                "cargo": ct.cargo or None,
                "sucursal_id": d.get("sucursal_id"),
                "estado": ct.estado,
                "estado_label": ct.get_estado_display(),
            })

        return resultado