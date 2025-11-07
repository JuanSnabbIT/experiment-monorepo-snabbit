---
title: "Plantilla: Registro de Hallazgo (Bug, Inconsistencia o Mejora)"
scope: "tracking"
status: "template"
last_updated: "2025-11-07"
---

# 📝 Plantilla: Registro de Hallazgo

## 🐛 Para Bugs

```markdown
#### BUG-XXX: [Título descriptivo del bug]
**Módulo**: [Nombre del módulo - ej. Empresas, Cotizaciones]
**Descubierto en**: [exploracion/modulo.md](../exploracion/modulo.md) o "Durante desarrollo"
**Fecha**: YYYY-MM-DD
**Estado**: 🔴 Pendiente | 🟡 En investigación | 🟢 Resuelto

**Descripción**:
[Explicación clara de qué está mal. Ser específico.]

**Impacto**:
- [Consecuencia 1 - ej. "Bloquea onboarding de nuevos usuarios"]
- [Consecuencia 2 - ej. "No hay feedback visual"]
- [Severidad: P0/P1/P2/P3]

**Causa raíz** (si se conoce):
[Explicación técnica de por qué ocurre el bug]

**Para reproducir**:
1. Paso 1
2. Paso 2
3. Paso 3
4. **Resultado esperado**: [...]
5. **Resultado real**: [...]

**Solución propuesta**:
```[language]
// Código propuesto o pseudocódigo
```

**Archivos afectados**:
- `path/to/file1.py` (descripción del cambio)
- `path/to/file2.tsx` (descripción del cambio)

**Tests necesarios**:
- [ ] Unit test: [descripción]
- [ ] Integration test: [descripción]
- [ ] E2E test: [descripción]

**Referencias**:
- Ver [exploracion/modulo.md](../exploracion/modulo.md#fase-x)
- Django docs: [enlace](https://...)
- Issue relacionado: #XXX
```

---

## ⚠️ Para Inconsistencias

```markdown
#### INC-XXX: [Título descriptivo de la inconsistencia]
**Módulo**: [Nombre del módulo o "Backend General" / "Frontend General"]
**Descubierto en**: [Revisión de código / Análisis de modelos / etc.]
**Fecha**: YYYY-MM-DD
**Estado**: 🔴 Pendiente | 🟡 Documentado | 🟢 Resuelto

**Descripción**:
[Explicación de qué es inconsistente - ej. "Uso mixto de UUID y AutoField para IDs"]

**Ejemplos**:
```[language]
// Ejemplo 1: Inconsistencia
[código mostrando problema]

// Ejemplo 2: Otra instancia
[código mostrando mismo problema]
```

**Impacto**:
- [Consecuencia 1 - ej. "Confusión para desarrolladores"]
- [Consecuencia 2 - ej. "URLs mixtas"]

**Justificación actual** (si existe):
[Por qué está así - puede estar justificado]

**Decisión recomendada**:
**[MANTENER | CORREGIR | DOCUMENTAR]** - [Explicación de la decisión]

**Si MANTENER**:
[Por qué la inconsistencia está justificada]

**Si CORREGIR**:
```[language]
// Código propuesto para estandarizar
```

**Si DOCUMENTAR**:
[Dónde documentar la convención - ej. "Agregar a standards.md"]

**Archivos afectados**:
- `path/to/file1.py`
- `path/to/file2.py`
- `.github/instrucciones/procesos/standards.md` (documentación)

**Tests necesarios**:
- [ ] [Si aplica, tests para validar corrección]
```

---

## 💡 Para Mejoras Propuestas

```markdown
#### MEJ-XXX: [Título descriptivo de la mejora]
**Módulo**: [Nombre del módulo o "Backend General" / "Frontend General"]
**Descubierto en**: [Análisis de... / Revisión de performance / etc.]
**Fecha**: YYYY-MM-DD
**Estado**: 🔴 Propuesta | 🟡 Aprobada | 🟢 Implementada

**Descripción**:
[Qué se propone mejorar - ser específico]

**Motivación**:
[Por qué es importante esta mejora - ej. "Auditoría legal", "Performance", "DX"]

**Situación actual** (baseline):
```[language]
// Código actual
```

**Solución propuesta**:
```[language]
// Código propuesto con mejora
```

**Beneficios**:
- ✅ **Beneficio 1**: Explicación cuantificable si es posible
- ✅ **Beneficio 2**: Explicación
- ✅ **Beneficio 3**: Explicación

**Trade-offs** (si existen):
- ⚠️ **Trade-off 1**: [ej. "Aumenta complejidad inicial"]
- ⚠️ **Trade-off 2**: [ej. "Requiere migración de datos"]

**Consideraciones de implementación**:
- [Consideración 1 - ej. "Migration grande, ejecutar en mantenimiento"]
- [Consideración 2 - ej. "Requiere actualizar todos los ViewSets"]

**Plan de implementación**:
1. Paso 1 (estimación: X horas)
2. Paso 2 (estimación: X horas)
3. Paso 3 (estimación: X horas)

**Estimación total**: X horas

**Archivos afectados**:
- `path/to/file1.py` (crear nueva clase base)
- `path/to/file2.py` (migrar a nueva base)
- [Lista completa de archivos]

**Tests necesarios**:
- [ ] Unit test: [descripción]
- [ ] Integration test: [descripción]
- [ ] Performance test: [descripción - benchmark antes/después]

**Métricas de éxito**:
- [Métrica 1 - ej. "Queries reducidas de 1000 a 3"]
- [Métrica 2 - ej. "Tiempo de respuesta < 100ms"]

**Referencias**:
- Django package: [enlace](https://...)
- Best practices: [enlace](https://...)
- Ejemplo en otro proyecto: [enlace](https://...)
```

---

## 📝 Nota Técnica

```markdown
#### NOTA-XXX: [Título descriptivo del patrón/observación]
**Módulo**: [Nombre del módulo]
**Fecha**: YYYY-MM-DD
**Categoría**: Arquitectura | Performance | Seguridad | Patrón de diseño

**Observación**:
[Qué se descubrió - patrón, técnica, comportamiento interesante]

**Ejemplo en código**:
```[language]
// Código que ejemplifica la observación
```

**Dónde se usa**:
- [Archivo 1]
- [Archivo 2]
- [Archivo N]

**Trade-offs** (si aplica):
- ✅ **Pro 1**: Explicación
- ✅ **Pro 2**: Explicación
- ❌ **Con 1**: Explicación
- ❌ **Con 2**: Explicación

**Best practice identificada** (si aplica):
[Cuándo usar este patrón vs alternativas]

**Lección aprendida**:
[Qué aprendiste y cómo aplicarlo en el futuro]

**Referencias**:
- [Documentación oficial](https://...)
- [Artículo técnico](https://...)
```

---

## 🔄 Cambio Planificado

```markdown
#### CAMBIO-XXX: [Título del cambio]
**Relacionado**: BUG-XXX / MEJ-XXX / INC-XXX
**Prioridad**: P0 | P1 | P2 | P3
**Estimación**: X horas
**Estado**: 🔴 Planificado | 🟡 En progreso | 🟢 Completado

**Objetivo**:
[Qué se busca lograr con este cambio]

**Tareas**:
- [ ] Tarea 1 (estimación: X min/horas)
- [ ] Tarea 2 (estimación: X min/horas)
- [ ] Tarea 3 (estimación: X min/horas)

**Bloqueadores** (si existen):
- [Bloqueador 1 - qué impide comenzar]

**Dependencias**:
- Requiere completar CAMBIO-YYY primero
- Requiere aprobación de [persona/equipo]

**Criterios de aceptación**:
- [ ] Criterio 1 (cómo verificar que está completo)
- [ ] Criterio 2
- [ ] Tests pasan
- [ ] Documentación actualizada

**Archivos afectados**:
- [Lista de archivos]

**Commit/PR**:
- Branch: `feature/cambio-xxx-titulo`
- Commit: [hash] (cuando se complete)
- PR: #XXX (cuando se cree)

**Fecha completado**: YYYY-MM-DD (cuando se complete)
```

---

## 🎯 Guía de Uso

### Cuándo Usar Cada Plantilla

**🐛 Bug**:
- Algo que NO funciona como debería
- Comportamiento inesperado
- Error que afecta funcionalidad

**⚠️ Inconsistencia**:
- Código que funciona pero es inconsistente
- Mix de estilos/convenciones
- Decisión arquitectónica no documentada

**💡 Mejora**:
- Optimización propuesta
- Nueva feature
- Refactorización planificada

**📝 Nota Técnica**:
- Patrón de diseño descubierto
- Observación arquitectónica
- Lección aprendida

**🔄 Cambio Planificado**:
- Cuando vas a implementar un bug/mejora
- Requiere tracking de tareas
- Para proyectos multi-sesión

### Cómo Agregar a hallazgos-y-mejoras.md

1. **Copiar** plantilla apropiada
2. **Rellenar** todos los campos (reemplazar `[...]`)
3. **Incrementar** número de hallazgo (XXX → siguiente disponible)
4. **Agregar** a la sección correcta (por prioridad o módulo)
5. **Actualizar** estadísticas al final del documento
6. **Commitear** con mensaje descriptivo: `docs: agregar [tipo]-XXX - [título]`

### Niveles de Prioridad

- **P0 (Crítico)**: Bloquea funcionalidad core, afecta producción
- **P1 (Alto)**: Afecta UX significativamente, seguridad, data integrity
- **P2 (Medio)**: Mejora calidad de código, DX, performance moderado
- **P3 (Bajo)**: Nice-to-have, optimizaciones menores, refactors

---

**Última actualización**: 2025-11-07  
**Mantenido por**: Equipo de desarrollo
