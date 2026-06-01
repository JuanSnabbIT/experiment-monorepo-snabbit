---
name: multi-tenancy
description: Patrón obligatorio de filtrado por empresa, riesgos de fuga de datos, cómo implementar
lastUpdated: 2026-06-01
relatedFiles:
  - backend/core/models.py
  - backend/contratos/views.py
  - .github/instructions/backend-guide.md
---

# Multi-tenancy en ERP Snabbit

## El Patrón

Todos los ViewSets DEBEN filtrar datos por empresa en `get_queryset()`.

El filtro obligatorio es:
```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    
    if personalizacion and personalizacion.sucursal_principal:
        empresa = personalizacion.sucursal_principal.empresa
        return MiModelo.objects.filter(empresa=empresa)
    
    return MiModelo.objects.none()  # Sin acceso si no hay personalización
```

El campo `PersonalizacionUsuario.sucursal_principal.empresa` es la **SSOT** de la empresa del usuario.

## Por Qué Es Crítico

Sin filtro multi-tenancy, usuarios de Empresa A verían datos de Empresa B. Esta es una **fuga de datos de seguridad crítica**.

## Verificación Rápida

Si ves un ViewSet sin `get_queryset()` o que accede directamente a `MiModelo.objects.all()`:
1. Implementar filtro multi-tenancy
2. Testear que Usuario A no ve datos de Usuario B
3. Documentar por qué si hay excepción (raro)

## Estado Actual

- ✅ **BodegaViewSet**: Implementado correctamente
- ✅ **OrdenDeTrabajoViewSet** (v2/v3): Implementado correctamente
- ✅ **Mayoría de ViewSets**: OK

Revisar `.github/instructions/backend-guide.md` para checklist.
