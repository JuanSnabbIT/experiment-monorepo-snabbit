# Backend Guide - Django + DRF

Guia concisa basada en el repositorio actual.

---

## Estructura de apps (realista)

En cada app de `backend/` se encuentran archivos como:

```
app/
├── migrations/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── filters.py          # opcional
├── tasks.py            # opcional (Celery)
├── functions.py        # opcional (logica pesada)
├── signals.py          # opcional
└── tests.py            # opcional
```

---

## Multi-tenancy (patron observado)

- Se usa `PersonalizacionUsuario` en varios ViewSets para filtrar por empresa/sucursal.
- Regla: `get_queryset()` debe filtrar por el contexto del usuario antes de aplicar filtros extra.

Ejemplo minimo:

```python
from core.models import PersonalizacionUsuario

def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if not personalizacion or not personalizacion.sucursal_principal:
        return self.queryset.model.objects.none()
    return self.queryset.model.objects.filter(
        empresa=personalizacion.sucursal_principal.empresa
    )
```

---

## Logica de negocio

- Logica pesada y generacion de PDFs deben vivir en `functions.py` (existen en varias apps).
- Views deben orquestar, no implementar logica extensa.

---

## Auth y permisos

- JWT (SimpleJWT) configurado en `sw_erp/settings.py`.
- `DEFAULT_PERMISSION_CLASSES` esta en `AllowAny`; cada ViewSet debe definir sus permisos.

---

## Migrations

- Siempre correr `python manage.py makemigrations` y `python manage.py migrate` al cambiar modelos.

---

## Tests y validacion

- Runner disponible: `python manage.py test`.
- No hay configuracion de pytest en el repo.

---

Ultima actualizacion: 2026-01-29
