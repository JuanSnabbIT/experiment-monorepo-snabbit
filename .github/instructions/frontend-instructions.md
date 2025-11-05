---
title: "Instrucciones Frontend (React + Vite + TypeScript)"
scope: "frontend"
status: "active"
last_updated: "2025-11-03"
---

# Instrucciones Frontend (React + Vite + TypeScript)

## Objetivo
Guiar el desarrollo, mantenimiento y revisión de código TypeScript/React en el frontend del ERP. Aplicable a desarrolladores humanos y agentes IA. Centraliza reglas sobre componentes, estado (Redux), servicios HTTP, rutas y estilado (TailwindCSS).

## Reglas clave

### 1. Arquitectura y estructura
- **`src/components/`**: componentes de presentación reutilizables (botones, formularios, tablas).
- **`src/pages/`**: páginas/vistas principales (orquestan componentes, conectan con estado/servicios).
- **`src/services/`**: llamadas HTTP centralizadas (BaseService.ts, módulos por dominio).
- **`src/store/`**: Redux Toolkit (slices, thunks) para estado global.
- **`src/routes/`**: definición de rutas, guardas (PrivateRoute), layout.
- **`src/hooks/`**: hooks personalizados (lógica reutilizable).
- **`src/assets/`**: imágenes, íconos, fuentes.

### 2. Componentes y tipado
- **Componentes funcionales**: usar Hooks; evitar clases.
- **TypeScript estricto**: definir `interface`/`type` para props y estado; evitar `any` salvo justificación.
- **Responsabilidad única**: separar presentación (componentes) de lógica (hooks, servicios).
- **Memoización**: usar `React.memo`, `useMemo`, `useCallback` donde mejore performance sin complicar código.
- Ejemplo:
  ```tsx
  interface ProductoCardProps {
    nombre: string;
    precio: number;
    onClick: () => void;
  }
  
  const ProductoCard: React.FC<ProductoCardProps> = ({ nombre, precio, onClick }) => (
    <div onClick={onClick}>
      <h3>{nombre}</h3>
      <p>${precio}</p>
    </div>
  );
  ```

### 3. Estado global (Redux Toolkit)
- **Slices por dominio**: `src/store/<feature>Slice.ts` con `initialState` tipado, reducers puros y thunks.
- **Thunks para efectos**: llamadas HTTP, persistencia, lógica asíncrona.
- **Normalización**: evitar duplicidad en el store; usar IDs y mapas cuando haya relaciones.
- Ejemplo:
  ```typescript
  import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
  
  export const fetchProductos = createAsyncThunk('productos/fetch', async () => {
    const response = await ProductoService.getAll();
    return response.data;
  });
  
  const productosSlice = createSlice({
    name: 'productos',
    initialState: { items: [], loading: false },
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(fetchProductos.pending, (state) => { state.loading = true; });
      builder.addCase(fetchProductos.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      });
    },
  });
  ```

### 4. Servicios HTTP
- **BaseService centralizado**: manejo de JWT (access/refresh), interceptores, base URL (`VITE_API_URL`).
- **Módulos por dominio**: `ProductoService`, `ContratoService`, etc.; extienden BaseService.
- **Manejo de errores**: capturar y mapear a mensajes de UI; reportar errores críticos.
- Ejemplo:
  ```typescript
  import axios from 'axios';
  
  const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
  
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  
  export const ProductoService = {
    getAll: () => api.get('/api/productos/'),
    getById: (id: number) => api.get(`/api/productos/${id}/`),
  };
  ```

### 5. Rutas y navegación
- **React Router**: definir rutas en `src/routes/`.
- **Lazy loading**: usar `React.lazy` + `Suspense` para páginas.
- **Rutas privadas**: wrapper `PrivateRoute` que valide token antes de renderizar.
- Ejemplo:
  ```tsx
  const Productos = React.lazy(() => import('./pages/Productos'));
  
  <Routes>
    <Route path="/productos" element={
      <Suspense fallback={<Spinner />}>
        <PrivateRoute><Productos /></PrivateRoute>
      </Suspense>
    } />
  </Routes>
  ```

### 6. Estilos (TailwindCSS)
- **Tailwind por defecto**: usar clases utilitarias; evitar CSS inline o archivos `.css` globales no controlados.
- **Tokens centralizados**: definir colores, spacing, fuentes en `tailwind.config.cjs`.
- **Componentes base reutilizables**: patrones de botones, inputs, cards con clases consistentes.

### 7. Accesibilidad (a11y)
- **Roles y ARIA**: añadir cuando corresponda (modales, menús, navegación).
- **Navegación por teclado**: asegurar `tabindex`, `onKeyDown` donde aplique.
- **Formularios**: asociar `label` con `input`; mensajes de error claros y anunciables.
- **Herramientas**: usar axe, Lighthouse para auditorías.

## Checklist de desarrollo

- [ ] Componentes funcionales con tipado estricto (props, estado).
- [ ] Estado local con `useState`; estado compartido en Redux (slices + thunks).
- [ ] Servicios HTTP centralizados; JWT manejado en BaseService.
- [ ] Rutas privadas con guardas; lazy loading de páginas.
- [ ] Estilos con Tailwind; tokens centralizados en config.
- [ ] Tests con Jest + RTL; mocks con `msw` para APIs.
- [ ] Accesibilidad: roles ARIA, navegación por teclado, labels en formularios.
- [ ] Build pasa sin errores; linters (ESLint) y Prettier aplicados.

## Comandos de desarrollo

### Desarrollo
```cmd
cd frontend
npm run dev
```

### Build y tests
```cmd
REM Build de producción
npm run build

REM Ejecutar tests
npm run test

REM Tests con cobertura
npm run test -- --coverage

REM Limpiar caché de tests
npm run test -- --clearCache
```

### Linting y formato
```cmd
REM Ejecutar linter
npm run lint

REM Aplicar Prettier
npm run format
```

## Referencias cruzadas
- [Backend (Django)](./backend-instructions.md): consumo de APIs REST.
- [Redux Toolkit y Thunks](./redux-thunks.md): guía detallada de Redux y operaciones asíncronas.
- [Estructura del Store](./store-structure.md): índice de todos los slices y cómo acceder a ellos.
- [Seguridad](./security.md): manejo de tokens JWT, validaciones frontend.
- [Testing](./testing.md): estrategias de tests frontend (RTL, msw).
- [Performance](./performance.md): memoización, lazy-load, optimización de re-renders.
- [Estándares](./standards.md): convenciones de código, ESLint, Prettier.

---
