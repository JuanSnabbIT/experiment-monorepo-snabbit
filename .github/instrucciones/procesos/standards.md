---
title: "Estándares de Código"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Estándares de Código

## Objetivo
Establecer convenciones de estilo, formato y estructura de código para garantizar consistencia, legibilidad y mantenibilidad del monorepo ERP. Aplicable a Python (backend) y TypeScript/React (frontend).

## Reglas clave

### 1. Convenciones de nombres

#### Backend (Python)
- **Módulos/paquetes**: `snake_case` (`models.py`, `serializers.py`).
- **Clases**: `PascalCase` (`ProductoSerializer`, `ContratoViewSet`).
- **Funciones/métodos**: `snake_case` (`get_queryset`, `calcular_total`).
- **Constantes**: `UPPER_SNAKE_CASE` (`MAX_UPLOAD_SIZE`, `DEFAULT_TIMEOUT`).
- **Variables**: `snake_case` (`contrato_id`, `usuario_actual`).

#### Frontend (TypeScript/React)
- **Archivos de componentes**: `PascalCase.tsx` (`ProductoCard.tsx`, `LoginPage.tsx`).
- **Archivos de servicios/utilidades**: `camelCase.ts` (`productoService.ts`, `formatUtils.ts`).
- **Componentes**: `PascalCase` (`ProductoCard`, `MainLayout`).
- **Funciones/variables**: `camelCase` (`fetchProductos`, `userToken`).
- **Constantes**: `UPPER_SNAKE_CASE` (`API_BASE_URL`, `MAX_RETRY_ATTEMPTS`).
- **Interfaces/tipos**: `PascalCase` con prefijo `I` opcional (`ProductoCardProps`, `IUser`).

### 2. Formato y linting

#### Backend (Python)
- **PEP 8**: estándar de estilo Python.
- **Black**: formateo automático (línea 88 caracteres, configurable).
- **isort**: ordenamiento de imports (grupos: estándar, terceros, locales).
- **Linter**: `ruff` (rápido) o `flake8` (tradicional); corregir warnings antes de commit.
- Ejemplo de configuración:
  ```ini
  # pyproject.toml
  [tool.black]
  line-length = 88
  
  [tool.isort]
  profile = "black"
  ```

#### Frontend (TypeScript/React)
- **ESLint**: reglas del repo (ver `.eslintrc.cjs`); corregir warnings antes de commit.
- **Prettier**: formateo automático (configurado en `prettier.config.cjs`).
- **TypeScript strict**: `"strict": true` en `tsconfig.json`; evitar `any` sin justificación.
- Ejemplo:
  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true
    }
  }
  ```

### 3. Estructura de archivos

#### Backend
```
<app>/
├── __init__.py
├── models.py          # Modelos de datos
├── serializers.py     # Serializadores DRF
├── views.py           # Vistas/ViewSets
├── urls.py            # Rutas de la app
├── tasks.py           # Tareas Celery
├── signals.py         # Señales Django
├── tests.py           # Tests unitarios/integración
└── migrations/        # Migraciones de DB
```

#### Frontend
```
src/
├── components/        # Componentes reutilizables
│   ├── Button.tsx
│   └── ProductoCard.tsx
├── pages/             # Páginas/vistas principales
│   ├── LoginPage.tsx
│   └── ProductosPage.tsx
├── services/          # Servicios HTTP
│   ├── BaseService.ts
│   └── productoService.ts
├── store/             # Redux slices/thunks
│   ├── store.ts
│   └── productosSlice.ts
├── routes/            # Configuración de rutas
│   └── AppRoutes.tsx
├── hooks/             # Hooks personalizados
│   └── useAuth.ts
└── assets/            # Recursos estáticos
```

### 4. Documentación en código

#### Docstrings (Python)
- **Obligatorios** en clases, métodos públicos y funciones de servicio.
- **Formato**: español, descripción breve + parámetros + retorno + excepciones.
- Ejemplo:
  ```python
  def calcular_total(items: list[dict]) -> Decimal:
      """
      Calcula el total de una lista de items.
      
      Args:
          items: Lista de diccionarios con 'precio' y 'cantidad'.
      
      Returns:
          Total calculado como Decimal.
      
      Raises:
          ValueError: Si algún item carece de 'precio' o 'cantidad'.
      """
      ...
  ```

#### JSDoc/TSDoc (TypeScript)
- **Opcional pero recomendado** en funciones complejas y servicios públicos.
- Ejemplo:
  ```typescript
  /**
   * Calcula el total de un pedido sumando precios y cantidades.
   * @param items - Array de items con precio y cantidad.
   * @returns Total calculado.
   */
  function calcularTotal(items: { precio: number; cantidad: number }[]): number {
    return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }
  ```

### 5. Imports y dependencias

#### Python
- **Orden**: estándar > terceros > locales (isort automático).
- **Imports absolutos**: preferir sobre relativos para claridad.
- Ejemplo:
  ```python
  import os
  from datetime import datetime
  
  from django.db import models
  from rest_framework import serializers
  
  from bodegas.models import Producto
  ```

#### TypeScript
- **Imports agrupados**: externos > alias (`@/`) > relativos.
- **Alias**: configurar en `tsconfig.json` (`@/components`, `@/services`).
- Ejemplo:
  ```typescript
  import React from 'react';
  import { useDispatch } from 'react-redux';
  
  import { ProductoCard } from '@/components';
  import { fetchProductos } from '@/store/productosSlice';
  ```

### 6. Responsabilidad y longitud

- **Funciones**: idealmente < 50 líneas; máximo 120 antes de refactorizar.
- **Clases/componentes**: responsabilidad única; dividir si crece excesivamente.
- **Archivos**: < 300 líneas; considerar dividir en módulos/subcomponentes.

### 7. Comentarios

- **Cuándo**: explicar *por qué*, no *qué* (el código debe autoexplicarse).
- **Evitar**: comentarios obvios (`# Incrementa contador`).
- **Útiles**: justificar decisiones técnicas, workarounds, TODOs con contexto.
- Ejemplo:
  ```python
  # WORKAROUND: API externa retorna null en lugar de lista vacía
  items = response.get('items') or []
  ```

## Checklist de estándares

- [ ] Nombres siguen convenciones (`snake_case`, `PascalCase`, `camelCase`).
- [ ] Linters pasan sin errores (backend: `ruff`/`flake8`; frontend: ESLint).
- [ ] Formateo aplicado (backend: `black` + `isort`; frontend: Prettier).
- [ ] Docstrings/JSDoc en funciones públicas y clases.
- [ ] Imports ordenados y agrupados correctamente.
- [ ] Funciones < 120 líneas; clases/componentes con responsabilidad única.
- [ ] Comentarios justifican decisiones técnicas, no describen código obvio.

## Referencias cruzadas
- [Backend (Django)](./backend/general.md): PEP 8, tipado, docstrings.
- [Frontend (React)](./frontend/general.md): ESLint, Prettier, tipado TypeScript.
- [PR Flow](./procesos/pr-flow.md): revisión de código y checklist de estándares.
- [Testing](./testing.md): convenciones de tests y cobertura.

---
