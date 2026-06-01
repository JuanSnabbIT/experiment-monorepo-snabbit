---
name: typescript-conventions
description: Convenciones TypeScript — Interfaces (prefijo I), types, strict mode, archivos
lastUpdated: 2026-06-01
relatedFiles:
  - frontend/tsconfig.json
  - frontend/src/interface/
  - .github/instructions/typescript.instructions.md
---

# TypeScript Conventions

## Modo Estricto (OBLIGATORIO)

**`frontend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

✅ **NUNCA** usar `any` implícito  
✅ **SIEMPRE** tipear parámetros de funciones  
✅ **SIEMPRE** tipear retorno de funciones

## Interfaz vs Type

### 🎯 Interface: Estructuras de Datos

```typescript
// ✅ BIEN
interface IOrdenDeTrabajo {
  id: number;
  numero: string;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
  createdAt: Date;
  cliente?: string;  // opcional
}

// ❌ MALO
type OrdenDeTrabajo = {
  id: number;
  numero: string;
  // ... (debería ser interface)
}
```

**Regla:** Prefijo `I` en interfaces  
**Ubicación:** `frontend/src/interface/{modulo}.interface.ts`

### 🎯 Type: Tipos y Uniones

```typescript
// ✅ BIEN
type TSelectOption = {
  label: string;
  value: string | number;
};

type TEstadoOT = 'abierta' | 'en_proceso' | 'cerrada';

type TColors = 'blue' | 'red' | 'green';

// ❌ MALO
interface TSelectOption { ... }  // Debería ser type
```

**Regla:** Prefijo `T` en types (opcional pero recomendado)  
**Ubicación:** Mismos archivos que interfaces, o `frontend/src/types/`

## Archivos de Tipos

**Estructura:**
```
frontend/src/interface/
├── ordenTrabajo.interface.ts
├── cotizacion.interface.ts
├── contrato.interface.ts
├── rrhh.interface.ts
└── [modulo].interface.ts
```

**Contenido:**
```typescript
// ordenTrabajo.interface.ts
export interface IOrdenDeTrabajo {
  id: number;
  numero: string;
  empresa_id: number;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrdenDeTrabajoForm {
  numero: string;
  empresa_id: number;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
}

export type TEstadoOT = IOrdenDeTrabajo['estado'];  // Extraer literal union
```

## Componentes Tipados

```typescript
// ✅ BIEN
interface IButtonProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<IButtonProps> = ({ children, onClick, disabled, color = 'primary' }) => {
  return <button onClick={onClick} disabled={disabled}>{children}</button>;
};

// ❌ MALO
const Button = ({ children, onClick, disabled, color }: any) => { ... }
```

## Custom Hooks

```typescript
// ✅ BIEN
interface IUseFormReturn {
  data: IOrdenDeTrabajo;
  isLoading: boolean;
  error: Error | null;
  handleSubmit: (data: IOrdenDeTrabajo) => Promise<void>;
}

function useOrdenDeTrabajoForm(id: number): IUseFormReturn {
  const [data, setData] = useState<IOrdenDeTrabajo>({} as IOrdenDeTrabajo);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return { data, isLoading, error, handleSubmit };
}

// Uso:
const { data, handleSubmit } = useOrdenDeTrabajoForm(123);
```

## RTK Query Endpoints

```typescript
// ✅ BIEN
interface IGetOrdenResponse {
  data: IOrdenDeTrabajo;
  message: string;
}

export const ordeneApi = createApi({
  reducerPath: 'ordenesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getOrden: builder.query<IOrdenDeTrabajo, number>({
      query: (id) => `/ordenes/${id}`,
    }),
    updateOrden: builder.mutation<IOrdenDeTrabajo, Partial<IOrdenDeTrabajo>>({
      query: (data) => ({
        url: `/ordenes/${data.id}`,
        method: 'PATCH',
        body: data,
      }),
    }),
  }),
});
```

## Enums vs Unions

```typescript
// ✅ BIEN (tipos literal)
type TEstadoOT = 'abierta' | 'en_proceso' | 'cerrada';

interface IOrdenDeTrabajo {
  estado: TEstadoOT;
}

// ⚠️ Si necesitas valores mapeados:
enum EstadoOT {
  ABIERTA = 'abierta',
  EN_PROCESO = 'en_proceso',
  CERRADA = 'cerrada',
}

const labelsByEstado: Record<EstadoOT, string> = {
  [EstadoOT.ABIERTA]: 'Abierta',
  [EstadoOT.EN_PROCESO]: 'En Proceso',
  [EstadoOT.CERRADA]: 'Cerrada',
};
```

## Errores Comunes

### ❌ `any` implícito
```typescript
// Malo
function handleSubmit(data: any) { ... }

// Bien
function handleSubmit(data: IOrdenDeTrabajo) { ... }
```

### ❌ Parámetros sin tipo
```typescript
// Malo
const items = [].map(item => item.id);

// Bien
const items: IOrdenDeTrabajo[] = [];
const ids = items.map((item: IOrdenDeTrabajo) => item.id);
```

### ❌ Union types mal usados
```typescript
// Malo
type Dato = IOrdenDeTrabajo | ICotizacion | string;

// Mejor (discriminated union)
type Dato = 
  | { type: 'orden'; data: IOrdenDeTrabajo }
  | { type: 'cotizacion'; data: ICotizacion }
  | { type: 'texto'; data: string };

function procesarDato(dato: Dato) {
  switch (dato.type) {
    case 'orden': dato.data.numero; // ✅ TypeScript sabe que es IOrdenDeTrabajo
    case 'cotizacion': dato.data.total; // ✅ TypeScript sabe que es ICotizacion
  }
}
```

## Checklist

```
☐ Todos los parámetros de función tipados
☐ Todos los retornos de función tipados
☐ Interfaces con prefijo I
☐ Types con prefijo T (recomendado)
☐ Archivos de tipos en frontend/src/interface/
☐ Componentes React.FC<IProps>
☐ RTK Query endpoints tipados <ReturnType, ParamType>
☐ Sin 'any' en el código (solo en casos excepcionales)
☐ 'strict': true en tsconfig.json
☐ npm run build pasa sin errores
```

---

**Cuándo usar esto:** Añadir componente/hook, tipear datos de API, refactorizar código old
