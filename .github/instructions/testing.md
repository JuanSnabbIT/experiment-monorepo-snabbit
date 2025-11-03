---
title: "Testing"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Testing

## Objetivo
Establecer estrategias, herramientas y criterios de cobertura para tests en el monorepo ERP. Cubrir unit, integración y end-to-end (e2e) en backend (Django) y frontend (React).

## Reglas clave

### 1. Estrategia de testing

- **Unit tests**: funciones/métodos individuales; sin dependencias externas (mocks/stubs).
- **Integration tests**: interacción entre módulos (modelos + serializers + vistas; componentes + servicios).
- **End-to-end (e2e)**: flujos completos de usuario (Cypress, Playwright); reservar para casos críticos.
- **Cobertura mínima**: 70% en módulos de negocio críticos (productos, contratos, inventario); 50% en módulos auxiliares.

### 2. Backend (Django)

#### Herramientas
- **Framework**: `django.test.TestCase` o `pytest-django`.
- **Fixtures**: usar `fixtures.json` o factories (`factory_boy`).
- **Mocks**: `unittest.mock` para servicios externos (Celery, Redis, APIs).

#### Tipos de tests

1. **Modelos**
   - Validar `clean()`, constraints, métodos personalizados.
   - Ejemplo:
     ```python
     from django.test import TestCase
     from bodegas.models import Producto
     
     class ProductoModelTest(TestCase):
         def test_str_representation(self):
             producto = Producto(nombre="Widget", codigo="W001")
             self.assertEqual(str(producto), "W001 - Widget")
     ```

2. **Serializers**
   - Validar `validate_<field>`, `validate`, `to_representation`.
   - Ejemplo:
     ```python
     from rest_framework.test import APITestCase
     from bodegas.serializers import ProductoSerializer
     
     class ProductoSerializerTest(APITestCase):
         def test_invalid_precio_negativo(self):
             data = {'nombre': 'Widget', 'precio': -10}
             serializer = ProductoSerializer(data=data)
             self.assertFalse(serializer.is_valid())
             self.assertIn('precio', serializer.errors)
     ```

3. **Vistas/ViewSets**
   - Validar permisos (200, 401, 403), filtros, paginación, respuestas.
   - Ejemplo:
     ```python
     from rest_framework.test import APITestCase
     from django.contrib.auth import get_user_model
     
     User = get_user_model()
     
     class ProductoViewSetTest(APITestCase):
         def setUp(self):
             self.user = User.objects.create_user(email='test@example.com', password='pass')
             self.client.force_authenticate(user=self.user)
         
         def test_list_productos_authenticated(self):
             response = self.client.get('/api/productos/')
             self.assertEqual(response.status_code, 200)
         
         def test_list_productos_unauthenticated(self):
             self.client.logout()
             response = self.client.get('/api/productos/')
             self.assertEqual(response.status_code, 401)
     ```

4. **Tareas Celery**
   - Validar lógica sin ejecutar Celery; usar `@task.apply()` o mocks.
   - Ejemplo:
     ```python
     from contratos.tasks import procesar_contrato
     
     def test_procesar_contrato(self):
         result = procesar_contrato.apply(args=[123])
         self.assertTrue(result.successful())
     ```

#### Comandos
```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py test
backend\ENV\Scripts\python.exe manage.py test bodegas
backend\ENV\Scripts\python.exe manage.py test bodegas.tests.test_models
```

### 3. Frontend (React)

#### Herramientas
- **Framework**: Jest + React Testing Library (RTL).
- **Mocks HTTP**: `msw` (Mock Service Worker) para APIs.
- **E2E**: Cypress o Playwright (opcional, para flujos críticos).

#### Tipos de tests

1. **Componentes**
   - Validar renderizado, props, eventos, accesibilidad.
   - Ejemplo:
     ```tsx
     import { render, screen, fireEvent } from '@testing-library/react';
     import ProductoCard from './ProductoCard';
     
     test('renderiza nombre y precio', () => {
       render(<ProductoCard nombre="Widget" precio={100} onClick={() => {}} />);
       expect(screen.getByText('Widget')).toBeInTheDocument();
       expect(screen.getByText('$100')).toBeInTheDocument();
     });
     
     test('llama onClick al hacer clic', () => {
       const handleClick = jest.fn();
       render(<ProductoCard nombre="Widget" precio={100} onClick={handleClick} />);
       fireEvent.click(screen.getByText('Widget'));
       expect(handleClick).toHaveBeenCalledTimes(1);
     });
     ```

2. **Hooks**
   - Usar `@testing-library/react-hooks` o renderizar componente de prueba.
   - Ejemplo:
     ```tsx
     import { renderHook, act } from '@testing-library/react-hooks';
     import useAuth from './useAuth';
     
     test('login actualiza estado', () => {
       const { result } = renderHook(() => useAuth());
       act(() => {
         result.current.login('test@example.com', 'pass');
       });
       expect(result.current.isAuthenticated).toBe(true);
     });
     ```

3. **Servicios (con msw)**
   - Mockear respuestas HTTP; validar llamadas y manejo de errores.
   - Ejemplo:
     ```tsx
     import { rest } from 'msw';
     import { setupServer } from 'msw/node';
     import ProductoService from './productoService';
     
     const server = setupServer(
       rest.get('/api/productos/', (req, res, ctx) => {
         return res(ctx.json([{ id: 1, nombre: 'Widget' }]));
       })
     );
     
     beforeAll(() => server.listen());
     afterEach(() => server.resetHandlers());
     afterAll(() => server.close());
     
     test('getAll retorna productos', async () => {
       const productos = await ProductoService.getAll();
       expect(productos.data).toHaveLength(1);
       expect(productos.data[0].nombre).toBe('Widget');
     });
     ```

#### Comandos
```cmd
cd frontend
npm run test
npm run test -- --coverage
```

### 4. Cobertura

- **Objetivo**: >= 70% en módulos críticos (productos, contratos, inventario); >= 50% en auxiliares.
- **Herramientas**: `coverage.py` (backend), `jest --coverage` (frontend).
- **Reportes**: generar en CI; fallar build si cobertura < umbral.

### 5. Tests en CI/CD

- Ejecutar en cada push/PR; fallar build si tests fallan.
- Reportar cobertura; alertar si disminuye significativamente.
- Ver [ci-cd.md](./ci-cd.md) para configuración de pipelines.

## Checklist de testing

- [ ] Tests unit para modelos/serializers (backend) y componentes (frontend).
- [ ] Tests de integración para vistas/endpoints (200/401/403).
- [ ] Tests de servicios HTTP con mocks (msw en frontend).
- [ ] Cobertura >= 70% en módulos críticos; >= 50% en auxiliares.
- [ ] Tests ejecutados en CI; build falla si tests fallan.
- [ ] Fixtures/factories para datos de prueba reutilizables.
- [ ] E2E para flujos críticos (login, crear contrato, movimiento inventario).

## Referencias cruzadas
- [Backend (Django)](./backend-instructions.md): tests de modelos, serializers, vistas.
- [Frontend (React)](./frontend-instructions.md): tests de componentes, hooks, servicios.
- [CI/CD](./ci-cd.md): ejecutar tests en pipelines, reportar cobertura.
- [Estándares](./standards.md): convenciones de tests y archivos.

---
