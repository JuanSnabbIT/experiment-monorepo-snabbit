# Documentación de Sistema de Permisos - ERP Monorepo

## 📖 Guía de Lectura

Este conjunto de documentos te ayudará a entender el sistema de permisos actual y planificar la modernización con Django Guardian.

---

## 📚 Documentos Disponibles

### 1. **Análisis del Sistema Actual** 
**📄 Archivo:** `ANALISIS_SISTEMA_PERMISOS.md`

**Para quién:** Desarrolladores nuevos en el proyecto, analistas

**Contenido:**
- ✅ Cómo funciona el sistema de permisos actual
- ✅ Arquitectura backend (Django + JWT + DRF)
- ✅ Flujo de autenticación completo
- ✅ Control de acceso en frontend (React + Redux)
- ✅ Filtrado de datos por empresa
- ✅ Limitaciones actuales
- ✅ Comparación con Django Guardian
- ✅ ¿Por qué modernizar?

**Lee este documento primero si:**
- Es tu primera vez en el proyecto
- Quieres entender cómo funcionan los permisos ahora
- Necesitas contexto antes de implementar cambios

---

### 2. **Plan de Implementación Django Guardian**
**📄 Archivo:** `PLAN_IMPLEMENTACION_GUARDIAN.md`

**Para quién:** Desarrolladores que van a implementar la modernización

**Contenido:**
- ✅ Instalación y configuración paso a paso
- ✅ Código de ejemplo (copy-paste ready)
- ✅ Scripts de migración de datos
- ✅ Tests unitarios
- ✅ Integración frontend/backend
- ✅ Optimización de performance
- ✅ Checklist completa

**Lee este documento si:**
- Ya entendiste el sistema actual
- Vas a implementar Django Guardian
- Necesitas código práctico y ejecutable

---

## 🚀 Flujo de Trabajo Recomendado

### Para Análisis (Semana 1)
1. **Leer:** `ANALISIS_SISTEMA_PERMISOS.md` completo
2. **Explorar:** Código mencionado en el análisis
3. **Probar:** Login y navegación del sistema actual
4. **Documentar:** Casos de uso específicos de tu empresa

### Para Implementación (Semanas 2-8)
1. **Leer:** `PLAN_IMPLEMENTACION_GUARDIAN.md`
2. **Seguir:** Fase 0 (Preparación y POC)
3. **Implementar:** Fases 1-5 gradualmente
4. **Validar:** Tests en cada fase
5. **Documentar:** Cambios y decisiones

---

## 🎯 Conceptos Clave a Entender

### 1. **Sistema Actual (sin Guardian)**

```
Usuario → JWT Token → IsAuthenticated → Filtrado Manual (get_queryset)
                                              ↓
                                      "Ver solo datos de MI empresa"
```

**Limitación:** No puedo decir "Usuario X puede ver Cotización #123 pero no #456"

### 2. **Sistema con Guardian**

```
Usuario → JWT Token → IsAuthenticated + Guardian → Permisos por Objeto
                                                         ↓
                                                "Usuario X puede ver/editar
                                                 ESTOS objetos específicos"
```

**Ventaja:** Permisos granulares a nivel de cada registro

---

## 📊 Comparación Rápida

| Lo que necesitas | Sistema Actual | Con Guardian |
|------------------|----------------|--------------|
| "¿Está autenticado?" | ✅ JWT | ✅ JWT (sin cambios) |
| "¿Es de su empresa?" | ✅ Filtrado manual | ✅ Permisos automáticos |
| "¿Puede editar ESTE contrato?" | ❌ No soportado | ✅ `user.has_perm('change_contrato', contrato)` |
| "Ver solo OTs asignadas a él" | ⚠️ Código custom | ✅ Guardian automático |
| "Transferir permisos al duplicar" | ❌ | ✅ `copiar_permisos_objeto()` |

---

## 🛠️ Herramientas Necesarias

### Para Análisis
- VS Code (ya tienes)
- Acceso al código backend y frontend
- Instancia local del proyecto corriendo

### Para Implementación
- Python 3.11+
- Django Guardian: `pip install django-guardian`
- PostgreSQL (recomendado para producción)
- Tests: pytest, pytest-django

---

## 🔗 Referencias Externas

### Django Guardian
- [Documentación oficial](https://django-guardian.readthedocs.io/)
- [GitHub](https://github.com/django-guardian/django-guardian)
- [Tutorial completo](https://testdriven.io/blog/django-permissions/)

### Django Permissions
- [Django Docs - Permissions](https://docs.djangoproject.com/en/5.1/topics/auth/default/#permissions-and-authorization)
- [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/)

### Sistema Actual del Proyecto
- [Backend Instructions](../.github/instructions/backend-instructions.md)
- [Security Instructions](../.github/instructions/security.md)
- [Frontend Instructions](../.github/instructions/frontend-instructions.md)

---

## 💡 Tips para Empezar

### Si eres nuevo en Django Guardian:

1. **Leer documentación oficial** (30 min)
   - https://django-guardian.readthedocs.io/en/stable/userguide/overview.html

2. **Hacer tutorial básico** (1 hora)
   - Crear proyecto Django simple
   - Instalar Guardian
   - Probar `assign_perm()` y `has_perm()`

3. **Revisar nuestro código** (2 horas)
   - Leer `ANALISIS_SISTEMA_PERMISOS.md`
   - Explorar ViewSets mencionados
   - Entender flujo actual

### Si ya conoces Django Guardian:

1. **Saltar a:** `PLAN_IMPLEMENTACION_GUARDIAN.md` → Fase 1
2. **Revisar:** Código existente (30 min)
3. **Ejecutar:** POC (Fase 0) para validar ambiente
4. **Planificar:** Qué ViewSets migrar primero

---

## 🤝 Soporte

### Dudas sobre el Sistema Actual
- Revisar código en: `backend/*/views.py`
- Buscar por: `get_queryset()`, `permission_classes`
- Consultar: `backend/sw_erp/settings.py` (config global)

### Dudas sobre Guardian
- Leer: `PLAN_IMPLEMENTACION_GUARDIAN.md` → Sección relevante
- Documentación oficial: https://django-guardian.readthedocs.io/
- Issues del proyecto: https://github.com/django-guardian/django-guardian/issues

### Dudas de Implementación
- Ver ejemplos de código en: `PLAN_IMPLEMENTACION_GUARDIAN.md`
- Tests de ejemplo incluidos en el plan
- Scripts de migración ready-to-use

---

## ✅ Checklist de Comprensión

Antes de implementar, asegúrate de entender:

- [ ] Cómo funciona JWT en este proyecto
- [ ] Qué es `UsuarioEmpresa` y por qué tiene `grupos`
- [ ] Cómo se filtran datos por empresa actualmente
- [ ] Por qué el frontend tiene `authority` en rutas
- [ ] Qué es `PersonalizacionUsuario.sucursal_principal`
- [ ] Diferencia entre permisos globales y por objeto
- [ ] Cómo Guardian se integra con DRF

**Si no entiendes algo de esta lista, vuelve a leer `ANALISIS_SISTEMA_PERMISOS.md`**

---

## 🎓 Glosario Rápido

| Término | Significado |
|---------|-------------|
| **JWT** | JSON Web Token - Token de autenticación del usuario |
| **DRF** | Django REST Framework - Framework para APIs |
| **ViewSet** | Clase de DRF que agrupa operaciones CRUD |
| **Guardian** | Biblioteca de Django para permisos por objeto |
| **get_queryset()** | Método que filtra qué objetos ve el usuario |
| **permission_classes** | Lista de permisos requeridos en un endpoint |
| **UsuarioEmpresa** | Relación usuario-empresa con grupos asignados |
| **assign_perm()** | Función de Guardian para dar permiso en un objeto |
| **has_perm()** | Verifica si usuario tiene permiso (Django/Guardian) |

---

**Fecha de creación:** 2025-11-03  
**Versión:** 1.0  
**Mantenido por:** Equipo de desarrollo ERP
