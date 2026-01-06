---
description: "Convenciones y patrones para TypeScript y React"
name: "Guia-TypeScript-React"
applyTo: "**/*.{ts,tsx}"
---

# Estándares para TypeScript y React

## Configuración y tipo estricto
- TypeScript strict mode: **temporalmente relajado** (`strict: false` en tsconfig.json).
- Objetivo: migrar progresivamente a `strict: true`. **Evita introducir más `any`**.
- Prioriza types sobre interfaces para objetos simples.
- Define interfaces en `src/interface/` con prefijo `I` (ej: `IOrdenTrabajo`).

## Componentes React
- **Componentes funcionales** con hooks únicamente.
- Props: Siempre tipadas explícitamente.
- Estado local: Usa `useState`; estado global: Redux Toolkit slices.
- Coloca componentes en `src/components/` (reutilizables) o `src/pages/` (vistas).

## Redux Toolkit
- Slices en `src/store/slices/` exportan thunks y actions.
- **HTTP calls**: Solo usa `ApiService.fetchData<T>()`, nunca `axios.create()` directo.
- Pattern de thunks:
  ```typescript
  export const myThunk = createAsyncThunk<ReturnType, ArgType, {rejectValue: string}>(
    'slice/myThunk',
    async (args, {rejectWithValue}) => {
      try {
        const response = await ApiService.fetchData<ReturnType>({
          url: '/api/endpoint/',
          method: 'get'
        })
        return response.data
      } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error))
      }
    }
  )
  ```

## ⚠️ Manejo de Errores (CRÍTICO)

**PROHIBIDO usar `any` en catch blocks.** Usar `unknown` + type guard:

```typescript
// ❌ INCORRECTO - NO usar
catch (error: any) {
  return rejectWithValue(error.response?.data || 'Error')
}

// ✅ CORRECTO - Usar siempre
import { isAxiosError } from 'axios'

catch (error: unknown) {
  return rejectWithValue(getErrorMessage(error))
}
```

### Helper obligatorio (crear en `utils/errorHandlers.ts`):

```typescript
import { isAxiosError, AxiosError } from 'axios'

interface ApiErrorResponse {
  detail?: string
  message?: string
  [key: string]: unknown
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.detail 
      ?? error.response?.data?.message 
      ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Error desconocido'
}
```

**Razón:** `any` rompe el type-safety y oculta errores en tiempo de compilación.

## Servicios y HTTP
- **BaseService.ts**: Axios instance con JWT interceptors (auto-refresh).
- No uses `isLoginRequest: true` excepto en endpoint de login.
- Tokens se inyectan automáticamente desde `auth.access` slice.

## Estilos
- **TailwindCSS** utility classes, minimal custom CSS.
- Usa clases semánticas y responsivas (ej: `md:`, `lg:`).

## Routing
- React Router v6, rutas definidas en `src/routes/`.
- Aside routes en `src/routes/asideRoutes.tsx`.

## Validación antes de commitear
- Ejecuta `npm run lint` para ESLint.
- Ejecuta `npm run prettier:fix` para formateo.
- Verifica que el build no falla: `npm run build`.

## Ejemplo de componente típico
```typescript
interface Props {
  ordenId: number;
  onClose: () => void;
}

export const DetalleOrdenModal: FC<Props> = ({ ordenId, onClose }) => {
  const dispatch = useAppDispatch();
  const orden = useAppSelector(state => state.ordenTrabajo.selectedOrden);
  
  useEffect(() => {
    dispatch(fetchOrdenByIdThunk(ordenId));
  }, [ordenId, dispatch]);
  
  return (
    <div className="modal">
      {/* contenido */}
    </div>
  );
};
```
