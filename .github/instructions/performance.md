---
title: "Performance"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Performance

## Objetivo
Establecer prácticas de optimización para garantizar tiempos de respuesta bajos, escalabilidad y uso eficiente de recursos en el monorepo ERP. Aplicable a backend (Django) y frontend (React).

## Reglas clave

### 1. Backend (Django)

#### Optimización de queries (problema N+1)
- **`select_related`**: para relaciones ForeignKey/OneToOne (SQL JOIN).
- **`prefetch_related`**: para relaciones ManyToMany/reverse ForeignKey (queries adicionales optimizadas).
- Ejemplo:
  ```python
  # Mal: N+1
  productos = Producto.objects.all()
  for p in productos:
      print(p.bodega.nombre)  # Query por cada producto
  
  # Bien: JOIN
  productos = Producto.objects.select_related('bodega').all()
  for p in productos:
      print(p.bodega.nombre)  # 1 query
  ```

#### Índices de base de datos
- **Añadir índices**: en campos consultados frecuentemente (filtros, ordenación, foreign keys).
- Ejemplo:
  ```python
  class Producto(models.Model):
      codigo = models.CharField(max_length=50, db_index=True)
      nombre = models.CharField(max_length=200, db_index=True)
      bodega = models.ForeignKey(Bodega, on_delete=models.CASCADE)  # índice automático
  ```

#### Paginación
- **Siempre paginar**: listas grandes con `PageNumberPagination` o `CursorPagination`.
- Configuración global en `settings.py`:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
      'PAGE_SIZE': 50,
  }
  ```

#### Caché
- **Redis**: cachear queries costosas, sesiones, resultados de Celery.
- Ejemplo:
  ```python
  from django.core.cache import cache
  
  def get_productos_activos():
      key = 'productos_activos'
      productos = cache.get(key)
      if not productos:
          productos = list(Producto.objects.filter(activo=True).values())
          cache.set(key, productos, timeout=300)  # 5 min
      return productos
  ```

#### Tareas asíncronas (Celery)
- **Delegar a Celery**: procesos pesados (envío de emails, generación de reportes, procesamiento de archivos).
- **Evitar blocking**: no ejecutar en request/response; encolar y devolver 202 Accepted.

### 2. Frontend (React)

#### Memoización
- **`React.memo`**: evitar re-renders de componentes si props no cambian.
- **`useMemo`**: cachear resultados de cálculos costosos.
- **`useCallback`**: estabilizar funciones para evitar re-renders de hijos.
- Ejemplo:
  ```tsx
  const ProductoCard = React.memo(({ producto }) => (
    <div>{producto.nombre}</div>
  ));
  
  const calcularTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }, [items]);
  
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  ```

#### Lazy loading
- **Código**: dividir por rutas con `React.lazy` + `Suspense`.
- **Imágenes**: usar atributo `loading="lazy"` o bibliotecas de lazy-load.
- Ejemplo:
  ```tsx
  const ProductosPage = React.lazy(() => import('./pages/ProductosPage'));
  
  <Suspense fallback={<Spinner />}>
    <ProductosPage />
  </Suspense>
  ```

#### Virtualización
- **Listas grandes**: usar `react-window` o `react-virtualized` para renderizar solo items visibles.
- Ejemplo:
  ```tsx
  import { FixedSizeList } from 'react-window';
  
  <FixedSizeList
    height={600}
    itemCount={productos.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>{productos[index].nombre}</div>
    )}
  </FixedSizeList>
  ```

#### Optimización de re-renders
- **Evitar funciones inline**: usar `useCallback`.
- **Evitar objetos/arrays inline**: extraer fuera del componente o memoizar.
- **Dividir componentes**: separar partes que no deben re-renderizarse juntas.

### 3. Assets y recursos

#### Backend
- **Archivos estáticos**: servir con Nginx/CDN, no Django.
- **Comprimir respuestas**: habilitar `GZipMiddleware` en producción.

#### Frontend
- **Build optimizado**: Vite minimiza y tree-shake automáticamente.
- **Imágenes**: comprimir (WebP, AVIF); usar `srcset` para responsive.
- **Fuentes**: subsetting, `font-display: swap`.
- **CDN**: servir assets desde CDN para reducir latencia.

### 4. Monitoreo de performance

- **Métricas backend**: latencia de endpoints, queries lentas (django-debug-toolbar en dev).
- **Métricas frontend**: Lighthouse, Web Vitals (LCP, FID, CLS).
- **Alertas**: configurar umbrales en [observability.md](./observability.md).

### 5. Profiling y debugging

- **Backend**: usar `django-silk` o `django-debug-toolbar` para identificar N+1 y queries lentas.
- **Frontend**: React DevTools Profiler, Lighthouse, Chrome DevTools Performance.

## Checklist de performance

- [ ] Queries usan `select_related`/`prefetch_related` donde aplique.
- [ ] Índices añadidos en campos consultados frecuentemente.
- [ ] Paginación habilitada en listas grandes.
- [ ] Caché (Redis) en queries costosas; TTL apropiado.
- [ ] Tareas pesadas delegadas a Celery.
- [ ] Componentes React memoizados (`React.memo`, `useMemo`, `useCallback`).
- [ ] Lazy loading de rutas y recursos pesados.
- [ ] Virtualización en listas > 100 items.
- [ ] Assets servidos desde CDN; imágenes comprimidas.
- [ ] Monitoreo de latencia y queries lentas habilitado.

## Referencias cruzadas
- [Backend (Django)](./backend-instructions.md): optimización de queries, Celery.
- [Frontend (React)](./frontend-instructions.md): memoización, lazy loading.
- [Observabilidad](./observability.md): métricas de performance, alertas.
- [Testing](./testing.md): tests de performance y carga.

---
