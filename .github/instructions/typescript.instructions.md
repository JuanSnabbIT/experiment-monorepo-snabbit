---
description: "Convenciones y patrones para TypeScript y React"
name: "Guia-TypeScript-React"
applyTo: "**/*.{ts,tsx}"
---

# Estandares TypeScript/React (repo actual)

## Configuracion
- `strict: true` en `frontend/tsconfig.json`.
- Evitar introducir `any` nuevo.

## Tipos
- Interfaces en `src/interface/` con prefijo `I`.
- Tipos de request/response en el mismo modulo cuando ayuden a claridad.

## Componentes React
- Componentes funcionales con hooks.
- Props tipadas explicitamente.

## Manejo de errores
- En nuevos cambios, usar `unknown` en `catch` y helper `getErrorMessage` (`src/utils/errorHandlers.ts`).

## HTTP
- Usar `ApiService.fetchData<T>()`.
- No crear instancias de axios adicionales.

## Validacion antes de commitear
- `npm run lint`
- `npm run prettier:fix`
- `npm run build`
