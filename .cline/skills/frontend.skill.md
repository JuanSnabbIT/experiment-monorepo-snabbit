---
name: frontend
description: "Guía de frontend React + TypeScript del ERP Snabbit. Usar cuando: crear o modificar páginas, componentes, RTK Query, interfaces, manejo de errores."
---

# Skill: Frontend — React + TypeScript

## Puntos clave
- Componentes UI: importar desde `@/components/ui/` (tema_base sync)
- Interfaces: prefijo `I` en `src/interface/`
- RTK Query: usar `invalidatesTags`, NUNCA `refetch()` manual (excepto botones de refresh)
- Manejo de errores: `getErrorMessage()` de `utils/errorHandlers.ts`
- Tablas: usar `@tanstack/react-table` con `createColumnHelper`

## Referencias
- Guía completa: `.github/instructions/frontend-patterns.md`
- TypeScript: `.github/instructions/typescript.instructions.md`
- RTK Query: `.github/instructions/rtk-query-best-practices.md`
- Visual consistency: `.github/instructions/visual-consistency.md`