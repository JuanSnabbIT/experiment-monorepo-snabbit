---
name: rrhh
description: "Módulo RRHH del ERP Snabbit. Usar cuando: implementar o modificar contratos laborales, anexos, firma digital, ciclo de vida del contrato, gestión de trabajadores (UsuarioEmpresa de empresa-cliente), filtro multi-tenancy de RRHH."
---

# Skill: RRHH - Contratos Laborales - ERP Snabbit

## Cuando usar este skill
- Implementar o modificar cualquier endpoint bajo `/api/rrhh/*`
- Trabajar con `ContratoTrabajador`, `AnexoContrato` o `EnvioContratoTrabajadorFirma`
- Gestionar trabajadores (usuarios de empresas-cliente con contrato activo)
- Modificar la máquina de estados del contrato laboral
- Implementar flujo de firma digital del trabajador (rutas públicas)
- Diagnosticar problemas de multi-tenancy en el módulo RRHH

## Qué es RRHH en este ERP
App en el menú lateral del ERP. Scope actual: **creación y gestión de contratos laborales para los usuarios de las empresas-cliente del prestador de servicios**.

Un **trabajador** en este módulo = `UsuarioEmpresa` perteneciente a una empresa-cliente que tiene al menos un `ContratoTrabajador` asociado. No existe un modelo `Trabajador` separado.

## Arquitectura
```
backend/rrhh/
  +- models.py          -> ContratoTrabajador, AnexoContrato, EnvioContratoTrabajadorFirma
  +- serializers.py     -> Read/Write separados + serializer de operación compuesta
  +- views.py           -> ContratoTrabajadorViewSet + vistas públicas de firma
  +- estados_modelo.py  -> TRANSICIONES_CONTRATO, TIPO_CONTRATO, choices
  +- urls.py            -> router /api/rrhh/ + rutas públicas /api/public/
```

## Máquina de estados
```python
TRANSICIONES_CONTRATO = {
    "borrador":             ["pendiente_aceptacion", "vigente", "anulado"],
    "pendiente_aceptacion": ["vigente", "anulado"],
    "vigente":              ["terminado", "anulado"],
    "terminado":            [],
    "anulado":              [],
}
```

## Multi-tenancy
```python
def get_queryset(self):
    empresa = _empresa_actual(self.request)
    if not empresa:
        return ContratoTrabajador.objects.none()
    ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]
    return ContratoTrabajador.objects.filter(
        usuario_empresa__sucursal__empresa_id__in=ids_visibles
    )
```

## Referencias
- Skill completa original: `.github/skills/rrhh/SKILL.md`
- Guía de desarrollo: `.github/instructions/rrhh-guide.md`
- Código frontend: `frontend/src/pages/RRHH/`
- Código backend: `backend/rrhh/`