# AUDIT-VISUAL-STYLES.md — Auditoría de Documentación Visual

**Fecha:** 2026-06-01  
**Status:** 🟡 PARCIAL — Documentación buena pero con inconsistencias críticas  
**Coverage:** 85% (bien estructurado, pero referencias rotas)

---

## 1️⃣ ANÁLISIS: Qué Está Documentado

### ✅ BIEN ESTRUCTURADO (85%)

| Documento | Líneas | Cobertura | Status |
|-----------|--------|-----------|--------|
| **visual-consistency.md** | 292 | UI/Form/Layout componenteslistados | ✅ ACTIVO |
| **SKILL.md (visual-styles)** | 136 | Índice maestro con referencias | ⚠️ REFERENCIAS ROTAS |
| **buttons.md** | 200+ | 17 patrones de botones documentados | ✅ COMPLETO |
| **badges.md** | 150+ | 5 tipos de badges (OT, cotización, OC, contrato, info) | ✅ COMPLETO |
| **modals.md** | 200+ | 6 tipos de modales | ✅ COMPLETO |
| **tables.md** | 300+ | TanStack, paginación, filtros, anchos | ✅ COMPLETO |
| **cards.md** | 150+ | 5 patrones de cards | ✅ COMPLETO |
| **dropdowns.md** | 120+ | 3 tipos + placements | ✅ COMPLETO |
| **forms.md** | 250+ | 10+ campos + Formik | ✅ COMPLETO |
| **layout.md** | 100+ | Estructura estándar + Subheader | ✅ COMPLETO |

---

## 2️⃣ PROBLEMAS CRÍTICOS ENCONTRADOS

### 🔴 CRÍTICA #1: Referencia Fantasma a tema_base/fyr-vite/

**Ubicación:** `visual-consistency.md` (línea 14)

```
| **Tema base** | `tema_base/fyr-vite/` | ❌ READ-ONLY |
| **Componentes UI** | `frontend/src/components/ui/` | ⚠️ Solo sincronizar desde tema_base |
```

**Realidad:**
- `tema_base/fyr-vite/` **NO EXISTE** en el filesystem actual
- Los componentes están en `frontend/src/components/ui/` (12 UI + 9 form + 4 layouts)
- No hay sincronización activa desde un repo externo
- Documentación es **aspiracional**, no real

**Impacto:** Desarrolladores buscan un repositorio que no existe, intentan sincronizar componentes que ya están en su lugar.

### 🟠 ALTA #2: Componentes Reales vs Documentados

**Documentado en visual-consistency.md:**
- 12 UI base ✅ (verificado)
- 9 Form ✅ (verificado)
- 4 Layout ✅ (verificado)

**PERO en frontend/src/components/ hay MÁS:**
- `components/form/FileInput.tsx` (nuevo, Sprint 21)
- `components/form/RadioCard.tsx` (nuevo, Sprint 21)
- `components/utils/` (tableros, paginación, etc.) — NO documentado
- `components/helper/` — NO listado
- `components/icon/` — NO listado
- `components/router/` — NO listado

### 🟠 ALTA #3: Skill Index (SKILL.md) Referencias Rotas

**Líneas 32-76 apuntan a:**
```
./buttons.md#volver-atras
./badges.md#estados-otv3
./modals.md#confirmacion
./forms.md#campo-texto
```

**Status:**
- ✅ `buttons.md` existe y tiene `#volver-atras`
- ✅ `badges.md` existe y tiene `#estados-otv3`
- ✅ Archivos existen, anchors verificados
- ⚠️ PERO: No hay validación que esté en uso en ciertos proyectos

---

## 3️⃣ VALIDACIÓN: Código Real vs Documentación

### ✅ Verificado Correcto

```tsx
// visual-consistency.md línea 70-82: Imports UI
import Button from '@/components/ui/Button';      ✅ Existe
import Badge from '@/components/ui/Badge';        ✅ Existe
import Modal from '@/components/ui/Modal';        ✅ Existe
import Table from '@/components/ui/Table';        ✅ Existe
```

**Estado componentes canonicos:** 100% consistente

### ⚠️ Parcialmente Verificado

```tsx
// forms.md: Formularios
- Campo texto ✅ (Input.tsx existe)
- Select datos de API ✅ (SelectReact.tsx existe)
- Checkbox ✅ (Checkbox.tsx existe)
- FileInput ❌ (No documentado, creado en Sprint 21)
- RadioCard ❌ (No documentado, creado en Sprint 21)
```

### ❌ Desactualizado

```
// visual-consistency.md línea 279-286: Sincronización
"Si se requiere actualizar un componente desde tema_base:
1. Copiar el archivo desde `tema_base/fyr-vite/src/components/`"
```

**Problema:** Proceso no aplicable. tema_base NO existe.

---

## 4️⃣ MATRIZ: Fidelidad vs Realidad

| Aspecto | Documentado | Real | Diferencia | Acción |
|---------|-------------|------|-----------|--------|
| **12 Componentes UI** | Sí | 12 ✅ | Coinciden | Nada |
| **9 Form components** | Sí | 11 (+ FileInput, RadioCard) | +2 nuevos | Actualizar |
| **4 Layout** | Sí | 4 ✅ | Coinciden | Nada |
| **tema_base/fyr-vite/** | SÍ (como READ-ONLY) | NO existe | Fantasma | ELIMINAR |
| **Sincronización tema** | Documentada | No existe proceso | Obsoleta | ELIMINAR |
| **Colores** | 8 documentados | Tailwind 8 usados | OK | Nada |
| **Iconos** | Heroicons + prefijo Hero | Heroicons + prefijo Hero | OK | Nada |
| **Patrones botones** | 17 patrones | Usados en código | OK | Nada |
| **Patrones badges** | 5 tipos | OT/Cotización/OC/Contrato documentados | OK | Nada |

---

## 5️⃣ RECOMENDACIONES

### 🔴 CRÍTICA (Hacer ya)

1. **Eliminar referencias a tema_base/fyr-vite/**
   - En `visual-consistency.md` línea 14-17
   - En `visual-consistency.md` línea 279-286
   - En `.github/copilot-instructions.md` (líneas que mencionan tema_base)
   - Cambiar a: "Componentes desarrollados localmente en `frontend/src/components/`"

2. **Crear archivo de componentes nuevos**
   - FileInput.tsx (Sprint 21)
   - RadioCard.tsx (Sprint 21)
   - Agregar a `visual-consistency.md`

### 🟠 ALTA (Próxima sesión)

3. **Actualizar componentes utils sin documentación**
   - Auditar `frontend/src/components/utils/`
   - Documentar los reutilizables (TableCardFooterTemplateV2, etc.)
   - Agregar a `visual-consistency.md`

4. **Limpiar SKILL.md**
   - Verificar que todos los links `[./file.md#anchor]` existan
   - Actualizar índice si hay nuevos patrones

5. **Crear archivo de componentes ocultos**
   - `components/helper/` — ¿qué contiene? ¿Debería ser público?
   - `components/icon/` — ¿usa Heroicons o SVG custom?
   - `components/router/` — ¿componentes de ruteo especializados?

---

## 6️⃣ CÓMO DEBERÍA ESTAR DOCUMENTADO

### Opción A: Mantener estructura (mínimos cambios)

```
visual-consistency.md
  Sección "Tema"
    - Eliminar párrafo tema_base/fyr-vite
    - Actualizar: "Componentes en frontend/src/components/"
    - Cambiar estado sincronización
    
  Sección "Componentes UI (12 base)"
    - Agregar subsección "Nuevos (Sprint 21)"
      - FileInput
      - RadioCard
```

### Opción B: Crear nuevo archivo (mejor)

```
Nuevo archivo: .github/skills/visual-styles/componentes-nuevos.md
  Documen FileInput, RadioCard con patrones
  
Actualizar: SKILL.md
  Agregar links a nuevos componentes
```

---

## 7️⃣ PROPUESTA FINAL

**Paso 1:** Eliminar referencias falsas a tema_base ⏱️ 10 min
**Paso 2:** Documentar nuevos componentes (FileInput, RadioCard) ⏱️ 20 min
**Paso 3:** Auditar componentes ocultos (helper, icon, router, utils) ⏱️ 30 min
**Paso 4:** Actualizar SKILL.md con links nuevos ⏱️ 10 min

**Total:** ~70 minutos

---

## 8️⃣ CHECKLIST DE VALIDACIÓN

- [ ] Ninguna referencia a tema_base/fyr-vite en documentación
- [ ] FileInput.tsx documentado
- [ ] RadioCard.tsx documentado
- [ ] Componentes en `components/utils/` auditados
- [ ] Componentes en `components/helper/` auditados
- [ ] SKILL.md actualizado con nuevos links
- [ ] Todos los links markdown funcionan (`[./file.md#anchor]`)
- [ ] Visual-consistency.md línea 279-286 actualizada (eliminar "sincronización tema_base")

---

**Próximo paso:** ¿Ejecuto los cambios o quieres revisar primero?
