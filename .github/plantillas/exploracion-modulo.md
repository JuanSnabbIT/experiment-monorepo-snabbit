---
title: "Plantilla: Exploración de Módulo"
scope: "exploración"
status: "template"
last_updated: "2025-11-07"
---

# 🔍 Exploración: [Nombre del Módulo]

## 📋 Metadata

- **Módulo**: [Nombre del módulo - ej. Cotizaciones, Bodegas, Usuarios]
- **Apps Django involucradas**: [Lista de apps - ej. cotizaciones, items]
- **Fecha inicio**: YYYY-MM-DD
- **Fecha actualización**: YYYY-MM-DD
- **Estado**: 🔴 Iniciado | 🟡 En progreso | 🟢 Completado
- **Progreso**: X% (features exploradas / features totales)
- **Explorador**: [Tu nombre]

---

## 🎯 Objetivos de la Exploración

**Objetivo principal**:
[Describe qué quieres comprender de este módulo - ej. "Entender flujo completo de creación de cotización hasta conversión en contrato"]

**Objetivos secundarios**:
- [ ] Objetivo 1
- [ ] Objetivo 2
- [ ] Objetivo 3

**Preguntas a responder**:
1. ¿Pregunta 1?
2. ¿Pregunta 2?
3. ¿Pregunta 3?

---

## 📚 Contexto Previo

**Documentación revisada**:
- [Arquitectura del Sistema](../arquitectura/sistema.md)
- [Backend: App X](../instrucciones/backend/xxx.md)
- [Otro documento relevante](./path/to/doc.md)

**Conocimiento previo necesario**:
- Concepto 1 (explicación breve)
- Concepto 2 (explicación breve)

**Dependencias de otros módulos**:
- Módulo A → relación con este módulo
- Módulo B → relación con este módulo

---

## 🗺️ Mapa del Módulo

### Modelos Principales

| Modelo | Propósito | Campos Clave | Relaciones |
|--------|-----------|--------------|------------|
| ModeloA | [Propósito] | campo1, campo2 | FK a ModeloX |
| ModeloB | [Propósito] | campo1, campo2 | M2M con ModeloY |

### Endpoints (API)

| Método | Endpoint | Propósito | Permisos |
|--------|----------|-----------|----------|
| GET | `/api/modulo/` | Listar | Autenticado |
| POST | `/api/modulo/` | Crear | Admin |
| GET | `/api/modulo/{id}/` | Detalle | Owner |
| PUT | `/api/modulo/{id}/` | Actualizar | Owner |
| DELETE | `/api/modulo/{id}/` | Eliminar | Admin |

### Páginas Frontend

| Ruta | Componente | Propósito |
|------|------------|-----------|
| `/modulo` | ModuloListPage | Listado |
| `/modulo/crear` | ModuloCreatePage | Formulario creación |
| `/modulo/:id` | ModuloDetailPage | Ver detalle |

### Redux Slice

- **Slice**: `moduloSlice`
- **Estado**:
  ```typescript
  interface ModuloState {
    items: Modulo[];
    selectedItem: Modulo | null;
    loading: boolean;
    error: string | null;
  }
  ```
- **Thunks**: `fetchModulos`, `createModulo`, `updateModulo`, `deleteModulo`

---

## 🧪 Fase de Exploración

### Fase 1: [Nombre de la fase - ej. "Listar existentes"]

**Fecha**: YYYY-MM-DD  
**Objetivo**: [Qué se busca lograr en esta fase]

**Acciones realizadas**:
1. Acción 1 (con resultado)
2. Acción 2 (con resultado)
3. Acción 3 (con resultado)

**Observaciones**:
- Observación 1 (hallazgo interesante)
- Observación 2 (comportamiento inesperado)

**Capturas de pantalla** (opcional):
![Descripción](./screenshots/modulo-fase1-screenshot.png)

**Resultado**: ✅ Éxito | ⚠️ Parcial | ❌ Blocker

**Blocker encontrado** (si aplica):
- **Descripción**: [Qué bloquea el progreso]
- **Causa sospechada**: [Por qué pasa]
- **Workaround**: [Cómo continuar mientras tanto]
- **Registrado en**: [tracking/hallazgos-y-mejoras.md#BUG-XXX](../tracking/hallazgos-y-mejoras.md)

---

### Fase 2: [Nombre de la fase]

**Fecha**: YYYY-MM-DD  
**Objetivo**: [...]

[Repetir estructura de Fase 1]

---

### Fase N: [Última fase]

[...]

---

## 🔍 Hallazgos Importantes

### 🐛 Bugs Encontrados

#### BUG-XXX: [Título del bug]
**Descripción**: [Qué está mal]  
**Reproducir**:
1. Paso 1
2. Paso 2
3. Resultado esperado vs real

**Impacto**: [Severidad y consecuencias]  
**Registrado en**: [tracking/hallazgos-y-mejoras.md#BUG-XXX](../tracking/hallazgos-y-mejoras.md)

---

### ⚠️ Inconsistencias

#### INC-XXX: [Título]
**Descripción**: [Qué es inconsistente]  
**Ejemplo**: [Código o captura]  
**Recomendación**: [Cómo mejorar]  
**Registrado en**: [tracking/hallazgos-y-mejoras.md#INC-XXX](../tracking/hallazgos-y-mejoras.md)

---

### 💡 Mejoras Propuestas

#### MEJ-XXX: [Título]
**Motivación**: [Por qué mejorar]  
**Propuesta**: [Cómo implementar]  
**Beneficio**: [Qué se gana]  
**Registrado en**: [tracking/hallazgos-y-mejoras.md#MEJ-XXX](../tracking/hallazgos-y-mejoras.md)

---

## 🧩 Patrones Arquitectónicos Descubiertos

### Patrón 1: [Nombre del patrón]

**Descripción**: [Qué patrón se usa]

**Ejemplo en código**:
```python
# backend/modulo/models.py
class Ejemplo(models.Model):
    # ...
```

**Dónde se usa**: [Lista de modelos/archivos que usan este patrón]

**Trade-offs**:
- ✅ **Ventaja 1**: Explicación
- ✅ **Ventaja 2**: Explicación
- ❌ **Desventaja 1**: Explicación

**Lección aprendida**: [Qué aprendiste sobre este patrón]

---

## 📊 Métricas de Exploración

| Métrica | Valor | Notas |
|---------|-------|-------|
| Features exploradas | X/Y (Z%) | Listado ✅, Creación ✅, Edición ⏳, Eliminación ❌ |
| Endpoints probados | X/Y (Z%) | GET /list ✅, POST /create ✅, ... |
| Bugs encontrados | X | Ver sección Hallazgos |
| Mejoras propuestas | X | Ver sección Hallazgos |
| Tiempo invertido | X horas | Distribuido en Y sesiones |

---

## 🎓 Lecciones Aprendidas

### 1. [Título de lección]

**Contexto**: [Qué estabas explorando cuando aprendiste esto]

**Lección**: [Qué aprendiste - técnico o de proceso]

**Aplicación futura**: [Cómo usar este conocimiento en el futuro]

---

### 2. [Título de lección]

[...]

---

## 🧭 Próximos Pasos

### Para Completar Esta Exploración

- [ ] Explorar feature faltante 1
- [ ] Explorar feature faltante 2
- [ ] Resolver blocker pendiente (BUG-XXX)
- [ ] Probar edge case X

### Para Exploración Futura (Otros Módulos)

- [ ] Explorar [Módulo relacionado 1] para entender integración
- [ ] Explorar [Módulo relacionado 2] para entender flujo completo

### Para Implementación (Después de Exploración)

- [ ] Implementar corrección de BUG-XXX
- [ ] Implementar MEJ-XXX
- [ ] Refactorizar código según patrones descubiertos

---

## ❓ Preguntas Pendientes

1. **¿Pregunta técnica 1?**
   - Contexto: [Por qué surge esta pregunta]
   - Impacto: [Qué bloquea o qué afecta]
   - Para investigar: [Dónde buscar respuesta]

2. **¿Pregunta técnica 2?**
   - [...]

---

## 📚 Referencias

- [Documentación Backend: App X](../instrucciones/backend/xxx.md)
- [Arquitectura Frontend](../arquitectura/frontend.md)
- [Modelo de Negocio](../arquitectura/modelo-negocio.md)
- [Hallazgos y Mejoras](../tracking/hallazgos-y-mejoras.md)
- Django docs: [Enlace relevante](https://docs.djangoproject.com/)

---

## 📝 Changelog de Esta Exploración

| Fecha | Cambio | Autor |
|-------|--------|-------|
| YYYY-MM-DD | Creación inicial del documento | [Tu nombre] |
| YYYY-MM-DD | Completada Fase 1: Listado | [Tu nombre] |
| YYYY-MM-DD | Agregado BUG-XXX, completada Fase 2 | [Tu nombre] |

---

**Última actualización**: YYYY-MM-DD  
**Estado**: 🔴 Iniciado | 🟡 En progreso | 🟢 Completado  
**Próxima revisión**: YYYY-MM-DD
